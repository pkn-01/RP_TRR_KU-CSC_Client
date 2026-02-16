"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import Swal from "sweetalert2";

/* =====================================================
    Types & Constants
===================================================== */

type Status =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_PARTS"
  | "COMPLETED"
  | "CANCELLED";

type Urgency = "NORMAL" | "URGENT" | "CRITICAL";

interface Attachment {
  id: number;
  fileUrl: string;
  filename: string;
}

interface User {
  id: number;
  name: string;
}

interface Assignee {
  id: number;
  userId: number;
  user: User;
}

interface HistoryLog {
  id: number;
  action: string;
  assigner: User;
  assignee: User;
  note: string;
  createdAt: string;
}

interface RepairDetail {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: string;
  location: string;
  status: Status;
  urgency: Urgency;
  assignees: Assignee[];
  reporterName: string;
  reporterDepartment: string;
  reporterPhone: string;
  createdAt: string;
  notes: string;
  messageToReporter: string;
  estimatedCompletionDate: string;
  attachments: Attachment[];
  assignmentHistory: HistoryLog[];
}

const URGENCY_CONFIG: Record<
  Urgency,
  { bg: string; text: string; label: string }
> = {
  NORMAL: { bg: "bg-green-100", text: "text-green-700", label: "ปกติ" },
  URGENT: { bg: "bg-orange-100", text: "text-orange-700", label: "ด่วน" },
  CRITICAL: { bg: "bg-red-500", text: "text-white", label: "ด่วนมาก" },
};

const STATUS_CONFIG: Record<
  Status,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-gray-100", text: "text-gray-800", label: "รอดำเนินการ" },
  ASSIGNED: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    label: "ถูกมอบหมาย",
  },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    label: "กำลังดำเนินการ",
  },
  WAITING_PARTS: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    label: "รออะไหล่",
  },
  COMPLETED: { bg: "bg-green-600", text: "text-white", label: "ปิดงาน" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-800", label: "ยกเลิก" },
};

function formatThaiDate(input?: string) {
  if (!input) return "-";
  try {
    return new Date(input).toLocaleString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return input;
  }
}

/* =====================================================
    Main Component
===================================================== */

export default function ITRepairDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // Data states
  const [data, setData] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // User states
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Editable fields
  const [notes, setNotes] = useState("");
  const [messageToReporter, setMessageToReporter] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Complete Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionReport, setCompletionReport] = useState("");
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [completionPreviews, setCompletionPreviews] = useState<string[]>([]);

  /* -------------------- Computed -------------------- */

  const isAssignedToMe = useCallback(() => {
    if (!data || !currentUserId) return false;
    return data.assignees?.some(
      (a) => a.userId === currentUserId || a.user?.id === currentUserId,
    );
  }, [data, currentUserId]);

  const canEdit = useCallback(() => {
    if (!data) return false;
    if (["COMPLETED", "CANCELLED"].includes(data.status)) return false;
    if (!isAssignedToMe()) return false;
    return !["PENDING", "ASSIGNED"].includes(data.status);
  }, [data, isAssignedToMe]);

  const canAcceptJob = useCallback(() => {
    if (!data) return false;
    return data.status === "ASSIGNED" && isAssignedToMe();
  }, [data, isAssignedToMe]);

  const canPickupJob = useCallback(() => {
    if (!data) return false;
    return data.status === "PENDING" && (data.assignees?.length || 0) === 0;
  }, [data]);

  /* -------------------- Init User -------------------- */
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      setCurrentUserId(parseInt(userId));
    }
  }, []);

  /* -------------------- Fetch Data -------------------- */
  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/repairs/${id}`);
        const assignees = res.assignees || [];

        setData({
          id: res.id,
          ticketCode: res.ticketCode,
          title: res.problemTitle,
          description: res.problemDescription,
          category: res.problemCategory,
          location: res.location,
          status: res.status,
          urgency: res.urgency,
          assignees: assignees,
          reporterName: res.reporterName,
          reporterDepartment: res.reporterDepartment,
          reporterPhone: res.reporterPhone,
          createdAt: res.createdAt,
          notes: res.notes || "",
          messageToReporter: res.messageToReporter || "",
          estimatedCompletionDate: res.estimatedCompletionDate || "",
          attachments: res.attachments || [],
          assignmentHistory: res.assignmentHistory || [],
        });

        setUrgency(res.urgency);
        // Don't pre-populate notes/messageToReporter – these are per-action inputs
      } catch {
        setError("ไม่สามารถโหลดข้อมูลงานซ่อมได้");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  /* -------------------- Actions -------------------- */

  const handleAcceptJob = async () => {
    if (!data) return;

    const { value: msg } = await Swal.fire({
      title: "รับงานนี้?",
      text: "คุณสามารถส่งข้อความถึงผู้แจ้งได้ (ถ้ามี)",
      icon: "question",
      input: "textarea",
      inputPlaceholder: "พิมพ์ข้อความถึงผู้แจ้งที่นี่...",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#a1a1aa",
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
    });

    if (msg === undefined) return;

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: "IN_PROGRESS",
          messageToReporter: msg || "",
        },
      });

      await Swal.fire({
        title: "รับงานสำเร็จ!",
        text: "คุณสามารถเริ่มดำเนินการได้เลย",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      window.location.reload();
    } catch (err: any) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "รับงานไม่สำเร็จ",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePickupJob = async () => {
    if (!data || !currentUserId) return;

    const { value: msg } = await Swal.fire({
      title: "รับงานซ่อมนี้?",
      text: "คุณจะถูกมอบหมายเป็นผู้รับผิดชอบ และสามารถส่งข้อความถึงผู้แจ้งได้",
      icon: "question",
      input: "textarea",
      inputPlaceholder: "พิมพ์ข้อความถึงผู้แจ้งที่นี่...",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#a1a1aa",
      confirmButtonText: "รับงาน",
      cancelButtonText: "ยกเลิก",
    });

    if (msg === undefined) return;

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          assigneeIds: [currentUserId],
          status: "IN_PROGRESS",
          messageToReporter: msg || "",
        },
      });

      await Swal.fire({
        title: "รับงานสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      window.location.reload();
    } catch (err: any) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "รับงานไม่สำเร็จ",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;

    const result = await Swal.fire({
      title: "ยืนยันการบันทึก?",
      text: "บันทึกการเปลี่ยนแปลงทั้งหมด",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#a1a1aa",
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          urgency,
          notes,
          messageToReporter,
        },
      });

      await Swal.fire({
        title: "บันทึกสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      // Clear operational fields for next entry
      setNotes("");
      setMessageToReporter("");

      // Re-fetch data to update history
      const res = await apiFetch(`/api/repairs/${data.id}`);
      const assignees = res.assignees || [];
      setData({
        id: res.id,
        ticketCode: res.ticketCode,
        title: res.problemTitle,
        description: res.problemDescription,
        category: res.problemCategory,
        location: res.location,
        status: res.status,
        urgency: res.urgency,
        assignees: assignees,
        reporterName: res.reporterName,
        reporterDepartment: res.reporterDepartment,
        reporterPhone: res.reporterPhone,
        createdAt: res.createdAt,
        notes: res.notes || "",
        messageToReporter: res.messageToReporter || "",
        estimatedCompletionDate: res.estimatedCompletionDate || "",
        attachments: res.attachments || [],
        assignmentHistory: res.assignmentHistory || [],
      });
      setUrgency(res.urgency);
    } catch (err: any) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "บันทึกข้อมูลไม่สำเร็จ",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteClick = () => {
    setShowCompleteModal(true);
  };

  const handleCompletionFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setCompletionFiles((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setCompletionPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeCompletionFile = (index: number) => {
    URL.revokeObjectURL(completionPreviews[index]);
    setCompletionFiles((prev) => prev.filter((_, i) => i !== index));
    setCompletionPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCompleteConfirm = async () => {
    if (!data) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("status", "COMPLETED");
      formData.append("completedAt", new Date().toISOString());
      if (completionReport.trim()) {
        formData.append("completionReport", completionReport.trim());
      }
      completionFiles.forEach((file) => {
        formData.append("files", file);
      });

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: formData,
      });

      await Swal.fire({
        title: "ปิดงานสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setShowCompleteModal(false);
      window.location.reload();
    } catch (err: any) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ปิดงานไม่สำเร็จ",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!data) return;
    if (!cancelReason.trim()) {
      Swal.fire({
        title: "กรุณาระบุเหตุผล",
        text: "ต้องระบุเหตุผลการยกเลิก",
        icon: "warning",
      });
      return;
    }

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: "CANCELLED",
          notes: cancelReason,
        },
      });

      await Swal.fire({
        title: "ยกเลิกสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setShowCancelModal(false);
      window.location.reload();
    } catch (err: any) {
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ยกเลิกไม่สำเร็จ",
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  /* -------------------- Loading State -------------------- */

  if (!data && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = ["COMPLETED", "CANCELLED"].includes(data.status);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                {data.title || data.ticketCode}
              </h1>
              <p className="text-sm text-gray-500">
                รหัสงาน: {data.ticketCode}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.status} />
              <UrgencyBadge urgency={data.urgency} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3 py-2 rounded-lg text-sm bg-white border border-gray-200 text-gray-700 hover:shadow"
            >
              ← ย้อนกลับ
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-2xl">
            {error}
          </div>
        )}

        {/* Accept Job Banner */}
        {canAcceptJob() && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-purple-900">
                งานนี้ถูกมอบหมายให้คุณ
              </p>
              <p className="text-sm text-purple-700">
                กดรับงานเพื่อเริ่มดำเนินการ
              </p>
            </div>
            <button
              onClick={handleAcceptJob}
              disabled={saving}
              className="bg-purple-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              รับงาน
            </button>
          </div>
        )}

        {/* Pickup Job Banner */}
        {canPickupJob() && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-blue-900">
                งานนี้ยังไม่มีผู้รับผิดชอบ
              </p>
              <p className="text-sm text-blue-700">คุณสามารถรับงานนี้ได้</p>
            </div>
            <button
              onClick={handlePickupJob}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              รับงาน
            </button>
          </div>
        )}

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT Column - Reporter Info */}
          <div className="space-y-4">
            {/* Reporter Info Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  ข้อมูลผู้แจ้ง
                </h2>
              </div>

              <div className="space-y-3">
                <InfoField label="ชื่อ" value={data.reporterName} />
                <InfoField label="แผนก" value={data.reporterDepartment} />
                <InfoField label="ติดต่อ" value={data.reporterPhone} />
              </div>

              {/* Attachments - Images */}
              {data.attachments && data.attachments.length > 0 && (
                <div className="mt-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200">
                    <img
                      src={data.attachments[0].fileUrl}
                      alt="รูปภาพประกอบ"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  {data.attachments.length > 1 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {data.attachments.slice(1).map((file) => (
                        <a
                          key={file.id}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={file.fileUrl}
                            alt={file.filename}
                            className="w-full h-20 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mt-4">
                <InfoField
                  label="รายละเอียด"
                  value={data.description || data.title}
                />
              </div>

              {/* Assignees (Read Only) */}
              <div className="mt-4">
                <InfoField
                  label="ผู้รับผิดชอบ"
                  value={
                    data.assignees && data.assignees.length > 0
                      ? data.assignees
                          .map((a) => a.user?.name || "Unknown")
                          .join(", ")
                      : "ยังไม่มีผู้รับงาน"
                  }
                />
              </div>
            </div>

            {/* Operational History Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                ประวัติดำเนินการ
              </h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {data.assignmentHistory && data.assignmentHistory.length > 0 ? (
                  data.assignmentHistory.map((log) => {
                    const { text, images } = parseHistoryNote(log.note);
                    const actionLabel =
                      log.action === "ASSIGN"
                        ? "มอบหมายงานให้"
                        : log.action === "UNASSIGN"
                          ? "ยกเลิกการมอบหมาย"
                          : log.action === "ACCEPT"
                            ? "รับงาน"
                            : log.action === "REJECT"
                              ? "ปฏิเสธงาน"
                              : log.action === "NOTE"
                                ? "หมายเหตุ"
                                : log.action === "MESSAGE_TO_REPORTER"
                                  ? "แจ้งผู้ซ่อม"
                                  : log.action === "STATUS_CHANGE"
                                    ? text.includes("เสร็จสิ้น")
                                      ? "ปิดงาน"
                                      : "เปลี่ยนสถานะ"
                                    : log.action;

                    const isAssignAction =
                      log.action === "ASSIGN" || log.action === "UNASSIGN";

                    if (isAssignAction) {
                      return (
                        <div key={log.id} className="py-2">
                          <p className="text-sm font-bold text-gray-800">
                            {actionLabel}
                          </p>
                          {log.assignee && (
                            <p className="text-sm text-gray-600">
                              {log.assignee.name}
                            </p>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={log.id}
                        className="rounded-2xl border border-gray-200 overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="border-l-4 border-green-500 px-4 pt-3 pb-2">
                          <p className="text-sm font-bold text-gray-900">
                            {actionLabel}
                          </p>
                        </div>

                        {/* Card Body */}
                        <div className="px-4 pb-3">
                          {/* Images (for completion) */}
                          {images.length > 0 && (
                            <div className="mb-2 grid grid-cols-2 gap-2">
                              {images.map((imgUrl, idx) => (
                                <a
                                  key={idx}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-xl overflow-hidden border border-gray-100 hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`evidence-${idx}`}
                                    className="w-full h-28 object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Timestamp + Note */}
                          <p className="text-xs text-gray-500">
                            <span>{formatThaiDate(log.createdAt)}</span>
                            {text && (
                              <span className="ml-2 text-gray-600">{text}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">
                    ยังไม่มีประวัติดำเนินการ
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT Column - Management */}
          <div className="space-y-4">
            {/* Urgency Dropdown */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="NORMAL">ความเร่งด่วน - ปกติ</option>
                <option value="URGENT">ความเร่งด่วน - ด่วน</option>
                <option value="CRITICAL">ความเร่งด่วน - ด่วนมาก</option>
              </select>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                หมายเหตุ
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                placeholder="หมายเหตุ..."
              />
            </div>

            {/* Message to Reporter */}
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <label className="text-xs font-medium text-gray-500 mb-2 block">
                แจ้งผู้ซ่อม
              </label>
              <textarea
                value={messageToReporter}
                onChange={(e) => setMessageToReporter(e.target.value)}
                rows={3}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                placeholder="ข้อความแจ้งผู้ซ่อม..."
              />
            </div>

            {/* Action Buttons */}
            {!isLocked && canEdit() && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={saving}
                  className="w-full py-3 text-red-500 text-base font-medium rounded-xl border-2 border-red-400 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full py-3 bg-blue-500 text-white text-base font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>

                {(data.status === "IN_PROGRESS" ||
                  data.status === "WAITING_PARTS") && (
                  <button
                    onClick={handleCompleteClick}
                    disabled={saving}
                    className="w-full py-3 bg-green-600 text-white text-base font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-5 h-5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    ปิดงาน (เสร็จสิ้น)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              ID : {data.ticketCode}
            </h2>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-4"
              placeholder="รายละเอียดเหตุผลที่ต้องยกเลิก"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-3 bg-blue-500 text-white text-base font-medium rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                ตกลง
              </button>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={saving}
                className="flex-1 py-3 text-white text-base font-medium rounded-xl bg-red-400 hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              รายงานปิดงาน
            </h2>
            <p className="text-sm text-gray-500 mb-4">ID: {data.ticketCode}</p>

            {/* Report Textarea */}
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              รายงานปิดงาน
            </label>
            <textarea
              value={completionReport}
              onChange={(e) => setCompletionReport(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4"
              placeholder="สรุปผลการดำเนินการซ่อม..."
            />

            {/* File Upload */}
            <label className="text-xs font-medium text-gray-500 mb-2 block">
              แนบรูปภาพ
            </label>
            <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-green-400 hover:text-green-600 cursor-pointer transition-colors mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              เลือกรูปภาพ
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleCompletionFileChange}
                className="hidden"
              />
            </label>

            {/* Image Previews */}
            {completionPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {completionPreviews.map((src, i) => (
                  <div key={i} className="relative group">
                    <img
                      src={src}
                      alt={`preview-${i}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeCompletionFile(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCompleteConfirm}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white text-base font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "ยืนยันปิดงาน"}
              </button>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setCompletionReport("");
                  completionPreviews.forEach((url) => URL.revokeObjectURL(url));
                  setCompletionFiles([]);
                  setCompletionPreviews([]);
                }}
                disabled={saving}
                className="flex-1 py-3 text-gray-600 text-base font-medium rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
    UI Components
===================================================== */

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const config = URGENCY_CONFIG[urgency];
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-gray-100 pb-2">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-700">{value || "-"}</p>
    </div>
  );
}

function parseHistoryNote(note: string) {
  if (!note) return { text: "", images: [] };

  const imagePattern = /\[IMAGES:(.*?)\]/;
  const match = note.match(imagePattern);

  if (match) {
    const text = note.replace(match[0], "").trim();
    const images = match[1].split(",").filter((url) => url.trim() !== "");
    return { text, images };
  }

  return { text: note, images: [] };
}
