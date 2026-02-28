"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import Swal from "sweetalert2";
import {
  ChevronLeft,
  Clock,
  CheckCircle2,
  User,
  Building2,
  Phone,
  Calendar,
  Package,
  Trash2,
  AlertCircle,
  Hash,
  FileText,
} from "lucide-react";
import Loading from "@/components/Loading";
import { safeFormat } from "@/lib/date-utils";

/* --- Types --- */
type LoanStatus = "BORROWED" | "RETURNED" | "OVERDUE" | "PENDING";

interface Loan {
  id: number;
  itemName: string;
  description?: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate?: string;
  status: LoanStatus;
  borrowerName: string;
  borrowerDepartment?: string;
  borrowerPhone?: string;
  borrowerLineId?: string;
  borrowedBy: {
    id: number;
    name: string;
    email: string;
  };
}

/* --- Constants --- */
const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  BORROWED: {
    label: "กำลังยืม",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  RETURNED: {
    label: "คืนสำเร็จ",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: CheckCircle2,
  },
  OVERDUE: {
    label: "เกินกำหนด",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: AlertCircle,
  },
  PENDING: {
    label: "รออนุมัติ",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: Clock,
  },
};

/* --- Main Page --- */
export default function LoanDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLoanDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiFetch(`/api/loans/${id}`);
      setLoan(data);
    } catch (err: any) {
      console.error("Failed to fetch loan details:", err);
      Swal.fire({
        title: "ไม่พบข้อมูล",
        text: "ไม่สามารถโหลดข้อมูลรายการยืมได้",
        icon: "error",
      });
      router.push("/admin/loans");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchLoanDetail();
  }, [fetchLoanDetail]);

  const handleReturnItem = async () => {
    if (!loan) return;

    const result = await Swal.fire({
      title: "ยืนยันการรับคืน?",
      text: "คุณต้องการบันทึกว่าได้รับคืนอุปกรณ์นี้แล้วใช่หรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการคืน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#10b981",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await apiFetch(`/api/loans/${loan.id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "RETURNED",
          returnDate: new Date().toISOString(),
        }),
      });

      await Swal.fire({
        title: "สำเร็จ!",
        text: "บันทึกการรับคืนอุปกรณ์เรียบร้อยแล้ว",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchLoanDetail();
    } catch (err: any) {
      Swal.fire(
        "เกิดข้อผิดพลาด",
        err.message || "ไม่สามารถอัปเดตสถานะได้",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loan) return;

    const result = await Swal.fire({
      title: "ลบรายการยืม?",
      text: "คุณต้องการลบรายการยืมนี้ใช่หรือไม่? การที่นี้ไม่สามารถย้อนกลับได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบรายการ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await apiFetch(`/api/loans/${loan.id}`, { method: "DELETE" });

      await Swal.fire({
        title: "ลบสำเร็จ!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/admin/loans");
    } catch (err: any) {
      Swal.fire(
        "เกิดข้อผิดพลาด",
        err.message || "ไม่สามารถลบรายการได้",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (!loan) return null;

  const currentStatus = statusConfig[loan.status] || {
    label: loan.status,
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
    icon: Clock,
  };
  const StatusIcon = currentStatus.icon;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-12">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
            >
              <ChevronLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform"
              />
              กลับไปหน้าจัดการ
            </button>

            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
                รายละเอียดการยืมอุปกรณ์
              </h1>
              <span
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${currentStatus.bg} ${currentStatus.color}`}
              >
                <StatusIcon size={16} />
                {currentStatus.label}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 font-medium">
              <Hash size={14} />
              <span>รหัสรายการ: {loan.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {loan.status !== "RETURNED" && (
              <button
                onClick={handleReturnItem}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={18} />
                รับคืนอุปกรณ์
              </button>
            )}
            <button
              onClick={handleDeleteLoan}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border-2 border-red-50 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={18} />
              ลบรายการ
            </button>
          </div>
        </div>

        {/* content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Device Information Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Package size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  ข้อมูลอุปกรณ์
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    ชื่ออุปกรณ์
                  </label>
                  <p className="text-lg font-bold text-gray-900">
                    {loan.itemName || "-"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    จำนวน
                  </label>
                  <p className="text-lg font-bold text-gray-900">
                    {loan.quantity} ชิ้น
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    รายละเอียดเพิ่มเติม / Serial
                  </label>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {loan.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Borrower Information Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <User size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  ข้อมูลผู้ยืม
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    ชื่อผู้ยืม
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-gray-900">
                      {loan.borrowerName || loan.borrowedBy.name}
                    </p>
                    {loan.borrowerName &&
                      loan.borrowerName !== loan.borrowedBy.name && (
                        <span className="text-xs text-gray-400 font-medium">
                          (ลงบันทึกโดย: {loan.borrowedBy.name})
                        </span>
                      )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    แผนก
                  </label>
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Building2 size={16} className="text-gray-400" />
                    <span>{loan.borrowerDepartment || "-"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    เบอร์โทรศัพท์
                  </label>
                  <div className="flex items-center gap-2 text-gray-800 font-medium">
                    <Phone size={16} className="text-gray-400" />
                    <span>{loan.borrowerPhone || "-"}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Line ID
                  </label>
                  <div className="flex items-center gap-2 text-gray-800 font-medium font-mono">
                    <span className="text-gray-400 font-bold">@</span>
                    <span>{loan.borrowerLineId || "-"}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            {/* Timeline Card */}
            <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                  <Calendar size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">กำหนดเวลา</h2>
              </div>

              <div className="space-y-6">
                <div className="relative pl-6 border-l-2 border-gray-100 space-y-8">
                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm"></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        วันที่ยืม
                      </label>
                      <p className="text-base font-bold text-gray-900">
                        {safeFormat(loan.borrowDate, "dd MMMM yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        {safeFormat(loan.borrowDate, "HH:mm น.")}
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm"></div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        กำหนดคืน
                      </label>
                      <p className="text-base font-bold text-gray-900">
                        {safeFormat(loan.expectedReturnDate, "dd MMMM yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        ภายในเวลา 17:00 น.
                      </p>
                    </div>
                  </div>

                  {loan.returnDate && (
                    <div className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm"></div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                          วันที่ส่งคืนจริง
                        </label>
                        <p className="text-base font-bold text-emerald-600">
                          {safeFormat(loan.returnDate, "dd MMMM yyyy")}
                        </p>
                        <p className="text-xs text-emerald-500 font-medium">
                          {safeFormat(loan.returnDate, "HH:mm น.")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Quick Actions / Tips */}
            <div className="bg-gray-900 rounded-2xl p-6 md:p-8 text-white shadow-xl shadow-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={20} className="text-blue-400" />
                <h3 className="font-bold">ระบบบันทึกการยืม</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed font-medium">
                การบันทึกข้อมูลที่ครบถ้วนจะช่วยให้การติดตามอุปกรณ์ทำได้ง่ายขึ้น
                และช่วยรวบรวมสถิติการใช้งานได้อย่างแม่นยำ
              </p>
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                  <span>ข้อมูลอัปเดตล่าสุด</span>
                  <span className="text-gray-300">
                    {safeFormat(loan.borrowDate, "dd/MM/yyyy")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
