"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import { AuthService } from "@/lib/authService";
import Swal from "sweetalert2";
import {
  User as UserIcon,
  MapPin,
  Clock,
  Image as ImageIcon,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
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
  PENDING: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  ASSIGNED: "bg-blue-100 text-blue-800 border border-blue-200",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  WAITING_PARTS: "bg-orange-100 text-orange-800 border border-orange-200",
  COMPLETED: "bg-green-100 text-green-800 border border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border border-red-200",
};

const URGENCY_CONFIG: Record<Urgency, { style: string; label: string }> = {
  NORMAL: {
    style: "bg-green-100 text-green-800 border border-green-200",
    label: "🟢 ปกติ",
  },
  URGENT: {
    style: "bg-orange-100 text-orange-800 border border-orange-200",
    label: "🟠 ด่วน",
  },
  CRITICAL: {
    style: "bg-red-100 text-red-800 border border-red-200",
    label: "🔴 ด่วนมาก",
  },
};

/* =====================================================
    Sub Components
===================================================== */

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`border border-gray-200 bg-white rounded-2xl p-5 animate-pulse ${className || ""}`}
    >
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
      <div className="mb-8 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-16 mb-4"></div>
        <div className="flex items-center gap-4">
          <div className="h-10 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded-full w-28"></div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-64" />
        </div>
        <div className="space-y-6">
          <SkeletonCard className="h-96" />
          <SkeletonCard className="h-32" />
        </div>
      </div>
    </div>
  );
}

function LightboxModal({
  images,
  currentIndex,
  onClose,
  onIndexChange,
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  if (currentIndex < 0 || currentIndex >= images.length) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 z-10"
      >
        <X className="w-8 h-8" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((currentIndex - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((currentIndex + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </>
      )}

      <img
        src={images[currentIndex]}
        alt="Preview"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/50 px-4 py-1.5 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}

/* =====================================================
    Main Component
===================================================== */

export default function RepairDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // Data states
  const [data, setData] = useState<RepairDetail | null>(null);
  const [initialData, setInitialData] = useState<any>(null); // For change detection
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [technicians, setTechnicians] = useState<User[]>([]);

  // User states
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Editable fields
  const [status, setStatus] = useState<Status>("PENDING");
  const [notes, setNotes] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">(""); // changed to single ID

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  // Complete Modal state (kept for file handling)
  const [completionFiles, setCompletionFiles] = useState<File[]>([]);
  const [completionPreviews, setCompletionPreviews] = useState<string[]>([]);

  /* -------------------- Computed -------------------- */

  const currentAssigneeIds = data?.assignees.map((a) => a.userId) || [];
  const isAssignedToMe = currentUserId
    ? currentAssigneeIds.includes(currentUserId)
    : false;

  const canEdit = useCallback(() => {
    if (!data) return false;
    if (["COMPLETED", "CANCELLED"].includes(data.status)) return false;
    if (isAdmin) return true;
    return isAssignedToMe && data.status !== "PENDING";
  }, [data, isAdmin, isAssignedToMe]);

  const hasChanges = () => {
    if (!initialData) return false;
    return (
      status !== initialData.status ||
      notes !== initialData.notes ||
      (assigneeId || "") !== (initialData.assigneeId || "")
    );
  };

  /* -------------------- Fetch Data -------------------- */

  const refetchData = useCallback(async () => {
    if (!id) return;
    const res = await apiFetch(`/api/repairs/${id}`);
    const assignees = res.assignees || [];

    // Combine notes and messageToReporter from backend for the frontend merged field
    let mergedNotes = res.notes || "";
    if (res.messageToReporter) {
      mergedNotes = mergedNotes
        ? `${mergedNotes}\n---ข้อความถึงผู้แจ้ง---\n${res.messageToReporter}`
        : res.messageToReporter;
    }

    const detailData: RepairDetail = {
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
      notes: mergedNotes,
      messageToReporter: "", // we don't plan to save back to this field separately
      estimatedCompletionDate: res.estimatedCompletionDate || "",
      attachments: res.attachments || [],
      assignmentHistory: res.assignmentHistory || [],
    };

    setData(detailData);
    setStatus(res.status);
    setNotes(mergedNotes);
    const primaryAssigneeId = assignees.length > 0 ? assignees[0].userId : "";
    setAssigneeId(primaryAssigneeId);

    setInitialData({
      status: res.status,
      notes: mergedNotes,
      assigneeId: primaryAssigneeId,
    });
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

  const handleSave = async () => {
    if (!data || !hasChanges()) return;

    try {
      setSaving(true);

      let finalStatus = status;
      // Auto upgrade status if assigned from pending
      if (finalStatus === "PENDING" && assigneeId) {
        finalStatus = "ASSIGNED";
      }

      const assigneeIdsToSave = assigneeId ? [Number(assigneeId)] : [];

      await apiFetch(`/api/repairs/${data.id}`, {
        method: "PUT",
        body: {
          status: finalStatus,
          urgency: data.urgency, // keep original urgency
          notes,
          messageToReporter: "", // backend might have this, send empty
          assigneeIds: assigneeIdsToSave,
        },
      });

      // Toast Success
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      Toast.fire({
        icon: "success",
        title: "บันทึกข้อมูลเรียบร้อยแล้ว",
      });

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
      html: `<p style="color:#ef4444; font-size:14px; margin-bottom:12px;">การยกเลิกงานไม่สามารถย้อนกลับได้</p>`,
      input: "textarea",
      inputLabel: "เหตุผลการยกเลิก",
      inputPlaceholder: "กรุณาระบุเหตุผลท่จำเป็นต้องยกเลิก...",
      inputAttributes: {
        "aria-label": "เหตุผลการยกเลิก",
      },
      showCancelButton: true,
      confirmButtonText: "ยืนยันการยกเลิกงาน",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#9ca3af",
      icon: "warning",
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
        <label style="display:block;text-align:left;font-size:0.75rem;font-weight:500;color:#6b7280;margin-bottom:0.25rem;">สรุปผลการดำเนินการ (รายงานปิดงาน) <span style="color:#ef4444">*</span></label>
        <textarea id="swal-report" rows="4" placeholder="อธิบายสิ่งที่ได้ดำเนินการแก้ไข..." style="width:100%;padding:0.75rem 1rem;border:1px solid #e5e7eb;border-radius:0.75rem;font-size:0.875rem;resize:none;outline:none;box-sizing:border-box;"></textarea>
        <label style="display:block;text-align:left;font-size:0.75rem;font-weight:500;color:#6b7280;margin-top:1rem;margin-bottom:0.5rem;">แนบรูปภาพผลงาน (อุปกรณ์ ฯลฯ)</label>
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

        if (!report.trim()) {
          Swal.showValidationMessage("กรุณาระบุสรุปผลการดำเนินการ");
          return false;
        }

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

  const openLightbox = (index: number) => {
    if (!data) return;
    const urls = data.attachments.map((a) => a.fileUrl);
    setLightboxImages(urls);
    setLightboxIndex(index);
  };

  /* -------------------- Loading State -------------------- */

  if (loading && !data) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-gray-50/50">
        <PageSkeleton />
      </div>
    );
  }

  if (!data) return null;

  const isLocked = ["COMPLETED", "CANCELLED"].includes(data.status);

  /* -------------------- UI -------------------- */

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50/50 relative pb-12">
      <LightboxModal
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onClose={() => setLightboxIndex(-1)}
        onIndexChange={setLightboxIndex}
      />

      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600 mb-4"></div>
            <p className="text-gray-700 font-medium">กำลังบันทึกข้อมูล...</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        {/* ── Header ───────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
          <div>
            <button
              onClick={() => router.back()}
              className="group flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
            >
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              ย้อนกลับ
            </button>
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                {data.ticketCode}
              </h1>
              <span
                className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${STATUS_STYLE[data.status]}`}
              >
                {STATUS_LABEL[data.status]}
              </span>
            </div>

            {data.assignees.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-500 mr-1">
                  ผู้รับผิดชอบ:
                </span>
                {data.assignees.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 shadow-sm"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    {a.user.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Main Grid ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── LEFT: Info (2 cols inside Grid) ─── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reporter Info */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  ข้อมูลผู้แจ้ง
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    ชื่อผู้แจ้ง
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {data.reporterName || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    แผนก
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {data.reporterDepartment || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                    เบอร์ติดต่อ
                  </p>
                  <p className="text-sm font-medium text-gray-800">
                    {data.reporterPhone || "-"}
                  </p>
                </div>
              </div>
            </section>

            {/* Problem Details */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">
                    รายละเอียดปัญหา
                  </h2>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${URGENCY_CONFIG[data.urgency].style}`}
                >
                  {URGENCY_CONFIG[data.urgency].label}
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        สถานที่
                      </p>
                      <p className="text-sm font-medium text-gray-900 leading-relaxed">
                        {data.location || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1">
                        วันที่แจ้ง
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(data.createdAt).toLocaleString("th-TH", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                    เรื่องที่แจ้ง
                  </p>
                  <p className="text-base font-bold text-gray-900 mb-4">
                    {data.title || "-"}
                  </p>

                  {data.description && (
                    <>
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                        รายละเอียดเพิ่มเติม
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        {data.description}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Attachments */}
              {data.attachments && data.attachments.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-bold text-gray-900">
                      รูปภาพประกอบ ({data.attachments.length})
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {data.attachments.map((att, idx) => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => openLightbox(idx)}
                        className="relative group block rounded-xl overflow-hidden border border-gray-200 aspect-square w-full bg-gray-50 shadow-sm"
                      >
                        <img
                          src={att.fileUrl}
                          alt={att.filename}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Operation History Timeline */}
            <section className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Wrench className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">
                  ประวัติดำเนินการ
                </h2>
              </div>

              <div className="pl-3 py-2">
                {data.assignmentHistory && data.assignmentHistory.length > 0 ? (
                  <div className="space-y-8 relative before:absolute before:inset-0 before:left-[11px] before:-ml-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent">
                    {data.assignmentHistory.map((log) => {
                      const { text, images } = parseHistoryNote(log.note);
                      const actionLabel = getActionLabel(log.action, text);
                      let colorClass = "bg-gray-400 bg-white border-gray-300";
                      let textClass = "text-gray-900";

                      // Assign colors based on action manually
                      if (
                        log.action.includes("STATUS") ||
                        log.action === "RESOLVE"
                      ) {
                        colorClass = "bg-green-100 border-green-500";
                        textClass = "text-green-800";
                      } else if (
                        log.action === "ASSIGN" ||
                        log.action === "ACCEPT"
                      ) {
                        colorClass = "bg-blue-100 border-blue-500";
                        textClass = "text-blue-800";
                      }

                      return (
                        <div
                          key={log.id}
                          className="relative flex items-start gap-5"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-0 w-6 h-6 rounded-full border-4 ${colorClass} shadow-sm z-10 -ml-1`}
                          ></div>

                          {/* Content Box */}
                          <div className="ml-8 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1 gap-1">
                              <p className={`text-sm font-bold ${textClass}`}>
                                {actionLabel}
                                {log.assignee && (
                                  <span className="font-semibold text-gray-600 ml-1.5">
                                    — {log.assignee.name}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs font-medium text-gray-500 shrink-0 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDate(log.createdAt)}
                              </p>
                            </div>

                            {text && (
                              <p className="text-sm text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 mt-2.5 shadow-sm leading-relaxed">
                                {text}
                              </p>
                            )}

                            {images.length > 0 && (
                              <div className="mt-3.5 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {images.map((imgUrl, idx) => (
                                  <a
                                    key={idx}
                                    href={imgUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-xl overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity aspect-video shadow-sm"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`evidence-${idx}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <div className="inline-flex flex-col items-center justify-center p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl w-full max-w-sm mx-auto">
                      <Clock className="w-8 h-8 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-500">
                        ยังไม่มีประวัติดำเนินการ
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ─── RIGHT: Management (1 col) ─── */}
          <div className="space-y-6">
            <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5 pb-3 border-b border-gray-100">
                จัดการงานซ่อม
              </h3>

              <div className="space-y-6">
                {/* Status Update */}
                <div>
                  <label className="flex items-center text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    สถานะงาน
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    disabled={!canEdit() || isLocked}
                    className={`w-full px-4 py-3 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 shadow-sm transition-shadow ${isLocked ? "border-gray-200 bg-gray-50 text-gray-500" : "border-gray-300 bg-white hover:border-blue-400"}`}
                  >
                    <option value="PENDING">⚪ รอดำเนินการ</option>
                    <option value="ASSIGNED">🔵 มอบหมายแล้ว</option>
                    <option value="IN_PROGRESS">🟣 กำลังดำเนินการ</option>
                    <option value="WAITING_PARTS">🟠 รออะไหล่</option>
                    {/* Keep completed/cancelled visible if already in that state */}
                    {data.status === "COMPLETED" && (
                      <option value="COMPLETED">🟢 เสร็จสิ้น</option>
                    )}
                    {data.status === "CANCELLED" && (
                      <option value="CANCELLED">🔴 ยกเลิก</option>
                    )}
                  </select>
                </div>

                {/* Assignment */}
                {data.assignees.length === 0 || !isLocked ? (
                  <div>
                    <label className="flex flex-col text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      <span>ผู้รับผิดชอบ (เลือกได้ 1 คน)</span>
                    </label>
                    <select
                      value={assigneeId}
                      onChange={(e) =>
                        setAssigneeId(
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                      disabled={!canEdit() && data.status !== "PENDING"}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 disabled:bg-gray-50 shadow-sm transition-shadow hover:border-blue-400"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                          {tech.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {/* Internal Notes */}
                <div>
                  <label className="flex text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    บันทึกภายใน (แจ้งผู้ซ่อม/หมายเหตุ)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    disabled={!canEdit() || isLocked}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-70 disabled:bg-gray-50 shadow-sm transition-shadow hover:border-blue-400"
                    placeholder="รายละเอียด / จดบันทึกภายในสำหรับทีมช่าง..."
                  />
                </div>
              </div>

              {/* Save Button */}
              {!isLocked && canEdit() && (
                <div className="pt-6 mt-6 border-t border-gray-100">
                  <button
                    onClick={handleSave}
                    disabled={saving || !hasChanges()}
                    className={`w-full py-3.5 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex justify-center items-center ${hasChanges() ? "bg-blue-600 hover:bg-blue-700 hover:shadow-md" : "bg-gray-300 cursor-not-allowed"}`}
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        กำลังบันทึก...
                      </div>
                    ) : (
                      "บันทึกการเปลี่ยนแปลง"
                    )}
                  </button>
                </div>
              )}
            </section>

            {/* Complete Action Area */}
            {!isLocked &&
              canEdit() &&
              (data.status === "IN_PROGRESS" ||
                data.status === "WAITING_PARTS") && (
                <section className="bg-white border border-green-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                  <h3 className="text-sm font-bold text-green-800 mb-2 ml-2">
                    ปิดงานซ่อม
                  </h3>
                  <p className="text-xs font-medium text-gray-600 mb-4 ml-2 leading-relaxed">
                    เมื่อดำเนินการเสร็จสิ้น
                    กรุณากดปุ่มเพื่อสรุปผลและแนบภาพประกอบปิดทิกเก็ต
                  </p>
                  <button
                    onClick={handleCompleteClick}
                    disabled={saving}
                    className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 hover:shadow-md shadow-sm transition-all disabled:opacity-50"
                  >
                    ปิดงาน (เสร็จสิ้น)
                  </button>
                </section>
              )}

            {/* Danger Zone */}
            {!isLocked && (canEdit() || isAdmin) && (
              <section className="bg-red-50/50 border-2 border-dashed border-red-200 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <AlertTriangle className="w-16 h-16 text-red-600" />
                </div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-red-700 mb-2 relative z-10">
                  <AlertTriangle className="w-4 h-4" />
                  Danger Zone
                </h3>
                <p className="text-xs font-medium text-gray-600 mb-5 relative z-10">
                  ยกเลิกคำขอแจ้งซ่อม หากไม่ใช่ปัญหา หรือเป็นข้อมูลซ้ำซ้อน
                </p>
                <button
                  onClick={handleCancelClick}
                  disabled={saving}
                  className="w-full relative z-10 py-3 bg-white border border-red-200 text-red-600 text-sm font-bold rounded-xl hover:bg-red-50 hover:border-red-300 focus:ring-4 focus:ring-red-100 shadow-sm transition-all disabled:opacity-50"
                >
                  ยกเลิกงาน
                </button>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
    Utils
===================================================== */

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
      return "บันทึกภายใน";
    case "MESSAGE_TO_REPORTER":
      return "แจ้งผู้ซ่อม";
    case "STATUS_CHANGE":
      return text.includes("เสร็จสิ้น") ? "ปิดงานซ่อม" : "อัปเดตสถานะ";
    default:
      return action;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  return d.toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
