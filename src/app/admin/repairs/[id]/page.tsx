
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import { AuthService } from "@/lib/authService";
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
  role: string;
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

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "รอดำเนินการ",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_PARTS: "รออะไหล่",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

const STATUS_STYLE: Record<Status, string> = {
  PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  ASSIGNED: "bg-blue-50 text-blue-700 border border-blue-200",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  WAITING_PARTS: "bg-orange-50 text-orange-700 border border-orange-200",
  COMPLETED: "bg-green-50 text-green-700 border border-green-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-200",
};

const URGENCY_CONFIG: Record<Urgency, { style: string; label: string }> = {
  NORMAL: {
    style: "bg-green-50 text-green-700 border border-green-200",
    label: "ปกติ",
  },
  URGENT: {
    style: "bg-orange-50 text-orange-700 border border-orange-200",
    label: "ด่วน",
  },
  CRITICAL: {
    style: "bg-red-50 text-red-700 border border-red-200",
    label: "ด่วนมาก",
  },
};

/* =====================================================
    Main Component
===================================================== */

export default function RepairDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // Data states
  const [data, setData] = useState<RepairDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState<User[]>([]);

  // User states
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Editable fields
  const [notes, setNotes] = useState("");
  const [messageToReporter, setMessageToReporter] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

  // Complete Modal state (kept for file handling)
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [completionPreviews, setCompletionPreviews] = useState<string[]>([]);

  /* -------------------- Computed -------------------- */

  const isAssignedToMe = currentUserId
    ? assigneeIds.includes(currentUserId)
    : false;

  const canEdit = useCallback(() => {
    if (!data) return false;
    if (["COMPLETED", "CANCELLED"].includes(data.status)) return false;
    if (isAdmin) return true;
    return isAssignedToMe && data.status !== "PENDING";
  }, [data, isAdmin, isAssignedToMe]);

  /* -------------------- Fetch Data -------------------- */

  const refetchData = useCallback(async () => {
    if (!id) return;
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
    setAssigneeIds(assignees.map((a: Assignee) => a.userId));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        await refetchData();
      } catch {
        setError("ไม่สามารถโหลดข้อมูลงานซ่อมได้");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, refetchData]);

  useEffect(() => {
    const userId = AuthService.getUserId();
    const adminRole = AuthService.isAdmin();
    setCurrentUserId(userId);
    setIsAdmin(adminRole);

    const fetchTechnicians = async () => {
      try {
        const res = await apiFetch("/api/users/it-staff");
        if (Array.isArray(res)) {
          const staff = res.map((u: User) => ({
            ...u,
            name: u.id === userId ? `${u.name} (คุณ)` : u.name,
          }));
          setTechnicians(staff);
        }
      } catch (err) {
        console.error("Failed to fetch technicians:", err);
      }
    };
    fetchTechnicians();
  }, []);

  /* -------------------- Actions -------------------- */

  const toggleAssignee = (userId: number) => {
    setAssigneeIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSave = async () => {
    if (!data) return;

    const result = await Swal.fire({
      title: "ยืนยันการบันทึก?",
      text: "บันทึกการเปลี่ยนแปลงทั้งหมด",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#9ca3af",
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);

      let finalStatus = data.status;
      if (data.status === "PENDING" && assigneeIds.length > 0) {
        finalStatus = "IN_PROGRESS";
      }

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: finalStatus,
          urgency,
          notes,
          messageToReporter,
          assigneeIds: assigneeIds,
        },
      });

      await Swal.fire({
        title: "บันทึกสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setNotes("");
      setMessageToReporter("");
      await refetchData();
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

  /* ---------- Cancel via SweetAlert2 ---------- */

  const handleCancelClick = async () => {
    if (!data) return;

    const { value: reason } = await Swal.fire({
      title: `ยกเลิกงาน ${data.ticketCode}`,
      input: "textarea",
      inputLabel: "เหตุผลการยกเลิก",
      inputPlaceholder: "รายละเอียดเหตุผลที่ต้องยกเลิก...",
      inputAttributes: {
        "aria-label": "เหตุผลการยกเลิก",
      },
      showCancelButton: true,
      confirmButtonText: "ยืนยันยกเลิก",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#9ca3af",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "กรุณาระบุเหตุผลการยกเลิก";
        }
      },
    });

    if (!reason) return;

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: "CANCELLED",
          notes: reason,
        },
      });

      await Swal.fire({
        title: "ยกเลิกสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

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

  /* ---------- Complete via SweetAlert2 ---------- */

  const handleCompleteClick = async () => {
    if (!data) return;

    // Reset file state
    completionPreviews.forEach((url) => URL.revokeObjectURL(url));
    setCompletionFiles([]);
    setCompletionPreviews([]);

    const { value: formValues } = await Swal.fire({
      title: "รายงานปิดงาน",
      html: `
        <p style="color:#6b7280;font-size:0.875rem;margin-bottom:1rem;">ID: ${data.ticketCode}</p>
        <label style="display:block;text-align:left;font-size:0.75rem;font-weight:500;color:#6b7280;margin-bottom:0.25rem;">รายงานปิดงาน</label>
        <textarea id="swal-report" rows="4" placeholder="สรุปผลการดำเนินการซ่อม..." style="width:100%;padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:0.75rem;font-size:0.875rem;resize:none;outline:none;box-sizing:border-box;"></textarea>
        <label style="display:block;text-align:left;font-size:0.75rem;font-weight:500;color:#6b7280;margin-top:1rem;margin-bottom:0.5rem;">แนบรูปภาพ</label>
        <input id="swal-files" type="file" accept="image/*" multiple style="width:100%;font-size:0.875rem;padding:0.5rem;border:1px solid #e5e7eb;border-radius:0.75rem;box-sizing:border-box;" />
        <div id="swal-previews" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-top:0.75rem;"></div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "ยืนยันปิดงาน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#9ca3af",
      width: 480,
      didOpen: () => {
        const fileInput = document.getElementById(
          "swal-files",
        ) as HTMLInputElement;
        const previewsDiv = document.getElementById(
          "swal-previews",
        ) as HTMLDivElement;
        if (fileInput) {
          fileInput.addEventListener("change", () => {
            previewsDiv.innerHTML = "";
            const files = Array.from(fileInput.files || []);
            files.forEach((file) => {
              const url = URL.createObjectURL(file);
              const img = document.createElement("img");
              img.src = url;
              img.alt = file.name;
              img.style.cssText =
                "width:100%;height:5rem;object-fit:cover;border-radius:0.5rem;border:1px solid #e5e7eb;";
              previewsDiv.appendChild(img);
            });
          });
        }
      },
      preConfirm: () => {
        const report =
          (document.getElementById("swal-report") as HTMLTextAreaElement)
            ?.value || "";
        const fileInput = document.getElementById(
          "swal-files",
        ) as HTMLInputElement;
        const files = Array.from(fileInput?.files || []);
        return { report, files };
      },
    });

    if (!formValues) return;

    try {
      setSaving(true);

      const formData = new FormData();
      formData.append("status", "COMPLETED");
      formData.append("completedAt", new Date().toISOString());
      if (formValues.report.trim()) {
        formData.append("completionReport", formValues.report.trim());
      }
      formValues.files.forEach((file: File) => {
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

  /* -------------------- Loading State -------------------- */

  if (!data && loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-3"></div>
          <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = ["COMPLETED", "CANCELLED"].includes(data.status);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-white relative">
      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">กำลังบันทึกข้อมูล...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        {/* ── Header ───────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors mb-1"
            >
              ← ย้อนกลับ
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">
              {data.ticketCode}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[data.status]}`}
            >
              {STATUS_LABEL[data.status]}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${URGENCY_CONFIG[data.urgency].style}`}
            >
              {URGENCY_CONFIG[data.urgency].label}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-2xl mb-6">
            {error}
          </div>
        )}

        {/* ── Main Grid ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ─── LEFT: Info (3 cols) ─── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Reporter Info */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                ข้อมูลผู้แจ้ง
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoField label="ชื่อ" value={data.reporterName} />
                <InfoField label="แผนก" value={data.reporterDepartment} />
                <InfoField label="ติดต่อ" value={data.reporterPhone} />
              </div>
            </section>

            {/* Problem Details */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                รายละเอียดปัญหา
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoField label="สถานที่" value={data.location} />
                  <InfoField label="เรื่อง" value={data.title} />
                </div>
                <InfoField
                  label="วันที่แจ้ง"
                  value={new Date(data.createdAt).toLocaleString("th-TH", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </div>

              {/* Attachments */}
              {data.attachments && data.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">รูปภาพประกอบ</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-xl overflow-hidden border border-gray-100 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.filename}
                          className="w-full h-48 object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Operation History */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                ประวัติดำเนินการ
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {data.assignmentHistory && data.assignmentHistory.length > 0 ? (
                  data.assignmentHistory.map((log) => {
                    const { text, images } = parseHistoryNote(log.note);
                    const actionLabel = getActionLabel(log.action, text);
                    const isAssignAction =
                      log.action === "ASSIGN" || log.action === "UNASSIGN";

                    if (isAssignAction) {
                      return (
                        <div
                          key={log.id}
                          className="py-2 border-b border-gray-50 last:border-b-0"
                        >
                          <p className="text-sm font-semibold text-gray-800">
                            {actionLabel}
                          </p>
                          {log.assignee && (
                            <p className="text-sm text-gray-500">
                              {log.assignee.name}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(log.createdAt)}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={log.id}
                        className="border border-gray-100 rounded-xl overflow-hidden"
                      >
                        <div className="border-l-4 border-gray-300 px-4 pt-3 pb-2">
                          <p className="text-sm font-semibold text-gray-800">
                            {actionLabel}
                          </p>
                        </div>
                        <div className="px-4 pb-3">
                          {images.length > 0 && (
                            <div className="mb-2 grid grid-cols-2 gap-2">
                              {images.map((imgUrl, idx) => (
                                <a
                                  key={idx}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-lg overflow-hidden border border-gray-100 hover:opacity-80 transition-opacity"
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
                          <p className="text-xs text-gray-400">
                            {formatDate(log.createdAt)}
                            {text && (
                              <span className="ml-2 text-gray-500">{text}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400 text-center py-6">
                    ยังไม่มีประวัติดำเนินการ
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ─── RIGHT: Management (2 cols) ─── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Assignment */}
            {data.assignees.length === 0 && (
              <section className="border border-gray-200 rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
                  มอบหมายงานผู้รับผิดชอบ
                </h3>
                <div className="space-y-2">
                  {technicians.length === 0 ? (
                    <p className="text-sm text-gray-400">ไม่พบรายชื่อ IT</p>
                  ) : (
                    technicians.map((tech) => (
                      <label
                        key={tech.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          assigneeIds.includes(tech.id)
                            ? "bg-blue-50 border-blue-200"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        } ${
                          canEdit() || data.status === "PENDING"
                            ? "cursor-pointer"
                            : "cursor-default opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={assigneeIds.includes(tech.id)}
                          onChange={() => toggleAssignee(tech.id)}
                          disabled={!canEdit() && data.status !== "PENDING"}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          {tech.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </section>
            )}

            {/* Urgency */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                ความเร่งด่วน
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="NORMAL">ปกติ</option>
                <option value="URGENT">ด่วน</option>
                <option value="CRITICAL">ด่วนมาก</option>
              </select>
            </section>

            {/* Notes */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                หมายเหตุ
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                placeholder="หมายเหตุ..."
              />
            </section>

            {/* Message to Reporter */}
            <section className="border border-gray-200 rounded-2xl p-5">
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                แจ้งผู้ซ่อม
              </label>
              <textarea
                value={messageToReporter}
                onChange={(e) => setMessageToReporter(e.target.value)}
                rows={3}
                disabled={!canEdit()}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-60"
                placeholder="ข้อความแจ้งผู้ซ่อม..."
              />
            </section>

            {/* Action Buttons */}
            {!isLocked && canEdit() && (
              <div className="space-y-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>

                {(data.status === "IN_PROGRESS" ||
                  data.status === "WAITING_PARTS") && (
                  <button
                    onClick={handleCompleteClick}
                    disabled={saving}
                    style={{ backgroundColor: "#16a34a", color: "#ffffff" }}
                    className="w-full py-3 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    ปิดงาน (เสร็จสิ้น)
                  </button>
                )}

                <button
                  onClick={handleCancelClick}
                  disabled={saving}
                  style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                  className="w-full py-3.5 text-white text-sm font-semibold rounded-xl hover:bg-red-600 shadow-sm transition-colors disabled:opacity-50"
                >
                  ยกเลิกงาน
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
    UI Components
===================================================== */

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || "-"}</p>
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

function getActionLabel(action: string, text: string): string {
  switch (action) {
    case "ASSIGN":
      return "มอบหมายงานให้";
    case "UNASSIGN":
      return "ยกเลิกการมอบหมาย";
    case "ACCEPT":
      return "รับงาน";
    case "REJECT":
      return "ปฏิเสธงาน";
    case "NOTE":
      return "หมายเหตุ";
    case "MESSAGE_TO_REPORTER":
      return "แจ้งผู้ซ่อม";
    case "STATUS_CHANGE":
      return text.includes("เสร็จสิ้น") ? "ปิดงาน" : "เปลี่ยนสถานะ";
    default:
      return action;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
