"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import { AuthService } from "@/lib/authService";
import Swal from "sweetalert2";
import {
  ChevronLeft,
  Clock,
  User,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  Send,
  XCircle,
} from "lucide-react";

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

const STATUS_MAP: Record<Status, { label: string; color: string; bg: string }> =
  {
    PENDING: {
      label: "รอรับเรื่อง",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    ASSIGNED: {
      label: "มอบหมายแล้ว",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    IN_PROGRESS: {
      label: "กำลังดำเนินการ",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    WAITING_PARTS: {
      label: "รออะไหล่",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    COMPLETED: {
      label: "เสร็จสิ้น",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    CANCELLED: { label: "ยกเลิก", color: "text-slate-500", bg: "bg-slate-100" },
  };

const URGENCY_CONFIG: Record<
  Urgency,
  { bg: string; text: string; label: string; dot: string }
> = {
  NORMAL: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "ปกติ",
    dot: "bg-emerald-500",
  },
  URGENT: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    label: "ด่วน",
    dot: "bg-orange-500",
  },
  CRITICAL: {
    bg: "bg-red-50",
    text: "text-red-700",
    label: "ด่วนมาก",
    dot: "bg-red-500",
  },
};

/* =====================================================
    Main Component
===================================================== */
export default function RepairDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Form States
  const [notes, setNotes] = useState("");
  const [messageToReporter, setMessageToReporter] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const isAssignedToMe = currentUserId
    ? assigneeIds.includes(currentUserId)
    : false;
  const isLocked = data
    ? ["COMPLETED", "CANCELLED"].includes(data.status)
    : false;

  const canEdit = useCallback(() => {
    if (!data || isLocked) return false;
    if (isAdmin) return true;
    return isAssignedToMe && data.status !== "PENDING";
  }, [data, isAdmin, isAssignedToMe, isLocked]);

  /* -------------------- Data Fetching -------------------- */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [repairRes, techRes] = await Promise.all([
          apiFetch(`/api/repairs/${id}`),
          apiFetch("/api/users/it-staff"),
        ]);

        setData(repairRes);
        setUrgency(repairRes.urgency);
        setAssigneeIds(repairRes.assignees?.map((a: any) => a.userId) || []);
        setTechnicians(techRes || []);

        setCurrentUserId(AuthService.getUserId());
        setIsAdmin(AuthService.isAdmin());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  /* -------------------- Handlers -------------------- */
  const handleSave = async () => {
    try {
      setSaving(true);
      let finalStatus = data.status;
      if (data.status === "PENDING" && assigneeIds.length > 0)
        finalStatus = "IN_PROGRESS";

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: finalStatus,
          urgency,
          notes,
          messageToReporter,
          assigneeIds,
        },
      });

      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });
      window.location.reload();
    } catch (err: any) {
      Swal.fire("ข้อผิดพลาด", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium">กำลังเตรียมข้อมูล...</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-12">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={18} />
            กลับหน้าหลัก
          </button>
          <div className="flex items-center gap-3">
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${STATUS_MAP[data.status as Status].bg} ${STATUS_MAP[data.status as Status].color}`}
            >
              {STATUS_MAP[data.status as Status].label}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-slate-400 font-mono text-sm tracking-widest uppercase">
                Ticket Record
              </span>
              <UrgencyBadge urgency={data.urgency} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {data.ticketCode}
            </h1>
          </div>

          <div className="text-left md:text-right">
            <p className="text-sm text-slate-400 mb-1">วันที่แจ้งซ่อม</p>
            <p className="text-slate-700 font-semibold flex items-center gap-2 md:justify-end">
              <Clock size={16} className="text-slate-400" />
              {new Date(data.createdAt).toLocaleDateString("th-TH", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Information & Timeline (Column Span 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="font-bold flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  รายละเอียดงานซ่อม
                </h2>
                <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 uppercase">
                  {data.problemCategory || "General"}
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-3">
                  {data.problemTitle}
                </h3>
                <p className="text-slate-600 leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {data.problemDescription || "ไม่ได้ระบุรายละเอียดเพิ่มเติม"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoItem
                    icon={<User size={16} />}
                    label="ผู้แจ้งซ่อม"
                    value={data.reporterName}
                    subValue={data.reporterDepartment}
                  />
                  <InfoItem
                    icon={<Phone size={16} />}
                    label="เบอร์ติดต่อ"
                    value={data.reporterPhone}
                    isCopyable
                  />
                  <InfoItem
                    icon={<MapPin size={16} />}
                    label="สถานที่"
                    value={data.location || "ไม่ระบุ"}
                  />
                </div>

                {data.attachments?.length > 0 && (
                  <div className="mt-8">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      ไฟล์แนบประกอบ
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {data.attachments.map((file: any) => (
                        <a
                          key={file.id}
                          href={file.fileUrl}
                          target="_blank"
                          className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 hover:ring-2 ring-blue-500 transition-all"
                        >
                          <img
                            src={file.fileUrl}
                            className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                            alt="Attachment"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
                              View Image
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Log */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="font-bold mb-6 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" />
                ประวัติการดำเนินการ
              </h2>
              <div className="space-y-6">
                {data.assignmentHistory?.length > 0 ? (
                  data.assignmentHistory.map((log: any, idx: number) => (
                    <TimelineItem
                      key={log.id}
                      log={log}
                      isLast={idx === data.assignmentHistory.length - 1}
                    />
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-slate-400 text-sm">
                      ยังไม่มีข้อมูลการดำเนินการในขณะนี้
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Control Panel */}
          <div className="space-y-6">
            {/* Actions Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-24">
              <h2 className="font-bold mb-5 flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                จัดการงานซ่อม
              </h2>

              <div className="space-y-5">
                {/* Tech Assignment */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                    ผู้รับผิดชอบ
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {technicians.map((tech) => (
                      <button
                        key={tech.id}
                        disabled={!canEdit() && data.status !== "PENDING"}
                        onClick={() => {
                          setAssigneeIds((prev) =>
                            prev.includes(tech.id)
                              ? prev.filter((i) => i !== tech.id)
                              : [...prev, tech.id],
                          );
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                          assigneeIds.includes(tech.id)
                            ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold"
                            : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                        } disabled:opacity-50`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${assigneeIds.includes(tech.id) ? "bg-blue-500" : "bg-slate-300"}`}
                          />
                          {tech.name} {tech.id === currentUserId && "(คุณ)"}
                        </div>
                        {assigneeIds.includes(tech.id) && (
                          <CheckCircle2 size={14} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgency Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                    ระดับความเร่งด่วน
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as Urgency)}
                    disabled={!canEdit()}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 ring-blue-500/20 outline-none transition-all disabled:opacity-50"
                  >
                    <option value="NORMAL">Normal - ปกติ</option>
                    <option value="URGENT">Urgent - ด่วน</option>
                    <option value="CRITICAL">Critical - ด่วนที่สุด</option>
                  </select>
                </div>

                {/* Internal Notes */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <FileText size={14} /> หมายเหตุภายใน
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={!canEdit()}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500/20 outline-none transition-all resize-none disabled:opacity-50"
                      placeholder="ระบุความคืบหน้า..."
                    />
                  </div>

                  <div className="group">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <MessageSquare size={14} /> ข้อความถึงผู้แจ้ง
                    </label>
                    <textarea
                      value={messageToReporter}
                      onChange={(e) => setMessageToReporter(e.target.value)}
                      disabled={!canEdit()}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 ring-blue-500/20 outline-none transition-all resize-none disabled:opacity-50"
                      placeholder="แจ้งผู้แจ้งซ่อมทราบ..."
                    />
                  </div>
                </div>

                {/* Main Action Buttons */}
                {!isLocked && canEdit() && (
                  <div className="space-y-3 pt-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send size={18} />
                      {saving ? "กำลังประมวลผล..." : "บันทึกการเปลี่ยนแปลง"}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="py-3 px-4 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-colors"
                      >
                        ยกเลิกงาน
                      </button>
                      <button
                        onClick={() => {}} // Connect to handleComplete
                        className="py-3 px-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-sm hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 size={16} />
                        ปิดงาน
                      </button>
                    </div>
                  </div>
                )}

                {isLocked && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                    <p className="text-slate-500 text-sm font-medium">
                      รายการนี้ถูกปิดหรือยกเลิกแล้ว
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modern Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center border-b border-slate-100">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                ยืนยันการยกเลิกงาน?
              </h3>
              <p className="text-slate-500 text-sm">
                กรุณาระบุเหตุผลเพื่อให้ผู้แจ้งซ่อมรับทราบ
              </p>
            </div>
            <div className="p-6">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:ring-2 ring-red-500/20 outline-none transition-all resize-none mb-4"
                rows={4}
                placeholder="ระบุเหตุผลที่นี่..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  ย้อนกลับ
                </button>
                <button
                  onClick={() => {}} // Connect to handleCancel
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 transition-all"
                >
                  ยืนยันยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
    UI Helper Components
===================================================== */

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const config = URGENCY_CONFIG[urgency];
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}

function InfoItem({ icon, label, value, subValue, isCopyable = false }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-700 truncate">
        {value || "-"}
      </p>
      {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
    </div>
  );
}

function TimelineItem({ log, isLast }: { log: any; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center z-10">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-100 my-1" />}
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-900">
            {log.assigner?.name || "System"}
          </span>
          <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
            {new Date(log.createdAt).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-sm text-slate-600 mb-2 leading-relaxed">
          {log.note}
        </p>
        <p className="text-[10px] text-slate-400 italic">
          {new Date(log.createdAt).toLocaleDateString("th-TH", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
