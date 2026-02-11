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

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  PENDING: { label: "รอดำเนินการ", color: "text-slate-600" },
  ASSIGNED: { label: "มอบหมายแล้ว", color: "text-blue-600" },
  IN_PROGRESS: { label: "กำลังดำเนินการ", color: "text-amber-600" },
  WAITING_PARTS: { label: "รออะไหล่", color: "text-purple-600" },
  COMPLETED: { label: "เสร็จสิ้น", color: "text-green-600" },
  CANCELLED: { label: "ยกเลิก", color: "text-red-600" },
};

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string }> = {
  NORMAL: { label: "ปกติ", color: "text-slate-600" },
  URGENT: { label: "ด่วน", color: "text-orange-600" },
  CRITICAL: { label: "ด่วนมาก", color: "text-red-600" },
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

  // Cancel Modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

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
        setNotes(res.notes || "");
        setMessageToReporter(res.messageToReporter || "");
        setAssigneeIds(assignees.map((a: Assignee) => a.userId));
      } catch {
        setError("ไม่สามารถโหลดข้อมูลงานซ่อมได้");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

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
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#e2e8f0",
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
        title: "บันทึกสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setNotes("");
      setMessageToReporter("");
      window.location.reload();
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

  const handleComplete = async () => {
    if (!data) return;

    const result = await Swal.fire({
      title: "ยืนยันการปิดงาน?",
      text: "เปลี่ยนสถานะเป็น 'เสร็จสิ้น'",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0f172a",
      cancelButtonColor: "#e2e8f0",
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
        },
      });

      await Swal.fire({
        title: "ปิดงานสำเร็จ",
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
        title: "ยกเลิกสำเร็จ",
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-slate-500">กำลังโหลด</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isLocked = ["COMPLETED", "CANCELLED"].includes(data.status);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-screen bg-white">
      {/* Header Bar */}
      <div className="border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ย้อนกลับ
            </button>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">สถานะ</span>
                <span className={`text-sm font-medium ${STATUS_CONFIG[data.status].color}`}>
                  {STATUS_CONFIG[data.status].label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">ความเร่งด่วน</span>
                <span className={`text-sm font-medium ${URGENCY_CONFIG[data.urgency].color}`}>
                  {URGENCY_CONFIG[data.urgency].label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Ticket Header */}
        <div className="mb-8">
          <div className="flex items-baseline gap-4 mb-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {data.ticketCode}
            </h1>
            <span className="text-sm text-slate-500">
              {new Date(data.createdAt).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-slate-600">{data.title}</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Problem Description */}
            <section>
              <h2 className="text-sm font-medium text-slate-900 mb-4">รายละเอียดปัญหา</h2>
              <div className="bg-slate-50 rounded-lg p-6">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {data.description}
                </p>
              </div>
            </section>

            {/* Attachments */}
            {data.attachments && data.attachments.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-slate-900 mb-4">ไฟล์แนบ</h2>
                <div className="grid grid-cols-2 gap-4">
                  {data.attachments.map((att) => (
                    <div key={att.id} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                      <img
                        src={att.fileUrl}
                        alt={att.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Activity Log */}
            <section>
              <h2 className="text-sm font-medium text-slate-900 mb-4">ประวัติดำเนินการ</h2>
              <div className="space-y-4">
                {data.assignmentHistory && data.assignmentHistory.length > 0 ? (
                  data.assignmentHistory.map((log, index) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-slate-900" />
                        {index < data.assignmentHistory.length - 1 && (
                          <div className="w-px h-full bg-slate-200 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-medium text-slate-900">
                            {log.action === "ASSIGN"
                              ? "มอบหมายงาน"
                              : log.action === "NOTE"
                                ? "เพิ่มหมายเหตุ"
                                : log.action === "MESSAGE_TO_REPORTER"
                                  ? "แจ้งผู้แจ้ง"
                                  : log.action}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(log.createdAt).toLocaleString("th-TH", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-1">{log.note}</p>
                        <p className="text-xs text-slate-500">
                          โดย {log.assigner?.name || "ระบบ"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 py-8 text-center">
                    ยังไม่มีประวัติดำเนินการ
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Reporter Info */}
            <section>
              <h2 className="text-sm font-medium text-slate-900 mb-4">ผู้แจ้ง</h2>
              <div className="space-y-3">
                <InfoRow label="ชื่อ" value={data.reporterName} />
                <InfoRow label="แผนก" value={data.reporterDepartment} />
                <InfoRow label="ติดต่อ" value={data.reporterPhone} />
                <InfoRow label="สถานที่" value={data.location} />
              </div>
            </section>

            <div className="border-t border-slate-100 pt-6" />

            {/* Assignment Section */}
            {data.assignees.length === 0 && (isAdmin || data.status === "PENDING") && (
              <section>
                <h2 className="text-sm font-medium text-slate-900 mb-4">มอบหมายงาน</h2>
                <div className="space-y-2">
                  {technicians.map((tech) => (
                    <label
                      key={tech.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        assigneeIds.includes(tech.id)
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={assigneeIds.includes(tech.id)}
                        onChange={() => toggleAssignee(tech.id)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span className="text-sm">{tech.name}</span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Current Assignees */}
            {data.assignees.length > 0 && (
              <section>
                <h2 className="text-sm font-medium text-slate-900 mb-4">ผู้รับผิดชอบ</h2>
                <div className="space-y-2">
                  {data.assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-medium">
                        {assignee.user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-900">{assignee.user.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {canEdit() && !isLocked && (
              <>
                <div className="border-t border-slate-100 pt-6" />

                {/* Urgency Selector */}
                <section>
                  <label className="text-sm font-medium text-slate-900 block mb-3">
                    ความเร่งด่วน
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as Urgency)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="NORMAL">ปกติ</option>
                    <option value="URGENT">ด่วน</option>
                    <option value="CRITICAL">ด่วนมาก</option>
                  </select>
                </section>

                {/* Notes */}
                <section>
                  <label className="text-sm font-medium text-slate-900 block mb-3">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                    placeholder="เพิ่มหมายเหตุ..."
                  />
                </section>

                {/* Message to Reporter */}
                <section>
                  <label className="text-sm font-medium text-slate-900 block mb-3">
                    ข้อความถึงผู้แจ้ง
                  </label>
                  <textarea
                    value={messageToReporter}
                    onChange={(e) => setMessageToReporter(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                    placeholder="ส่งข้อความถึงผู้แจ้ง..."
                  />
                </section>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                  </button>

                  {(data.status === "IN_PROGRESS" || data.status === "WAITING_PARTS") && (
                    <button
                      onClick={handleComplete}
                      disabled={saving}
                      className="w-full py-3 bg-white text-slate-900 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      ปิดงาน (เสร็จสิ้น)
                    </button>
                  )}

                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={saving}
                    className="w-full py-3 bg-white text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    ยกเลิกงาน
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              ยกเลิกงาน {data.ticketCode}
            </h2>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none mb-6"
              placeholder="ระบุเหตุผลในการยกเลิก..."
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={saving}
                className="flex-1 py-2.5 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "ยืนยัน"}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm text-slate-900 font-medium text-right">{value || "-"}</span>
    </div>
  );
}