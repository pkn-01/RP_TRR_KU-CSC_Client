"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import Swal from "sweetalert2";
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
const statusConfig: Record<string, { label: string; color: string }> = {
  BORROWED: { label: "กำลังยืม", color: "text-amber-600" },
  RETURNED: { label: "คืนสำเร็จ", color: "text-emerald-600" },
  OVERDUE: { label: "เกินกำหนด", color: "text-red-500" },
  PENDING: { label: "รออนุมัติ", color: "text-blue-500" },
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
      title: "รับคืนอุปกรณ์",
      text: "ยืนยันการรับคืนอุปกรณ์ชิ้นนี้",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
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
        title: "สำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      fetchLoanDetail();
    } catch (err: any) {
      Swal.fire("ผิดพลาด", err.message || "ไม่สามารถทำรายการได้", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loan) return;

    const result = await Swal.fire({
      title: "ลบรายการ",
      text: "คุณต้องการลบรายการยืมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#f43f5e",
    });

    if (!result.isConfirmed) return;

    try {
      setSaving(true);
      await apiFetch(`/api/loans/${loan.id}`, { method: "DELETE" });

      await Swal.fire({
        title: "ลบเรียบร้อยแล้ว",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      router.push("/admin/loans");
    } catch (err: any) {
      Swal.fire("ผิดพลาด", err.message || "ไม่สามารถลบได้", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (!loan) return null;

  const currentStatus = statusConfig[loan.status] || {
    label: loan.status,
    color: "text-gray-600",
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 pb-20">
      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="text-sm font-medium">กำลังประมวลผล...</div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-6 pt-10">
        {/* Simple Header */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-black transition-colors mb-6 text-sm flex items-center gap-1"
          >
            &larr; ย้อนกลับ
          </button>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-tight">
                รายการยืมอุปกรณ์
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {loan.itemName}
              </h1>
            </div>
            <div className="flex gap-4">
              {loan.status !== "RETURNED" && (
                <button
                  onClick={handleReturnItem}
                  disabled={saving}
                  className="text-sm font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                >
                  บันทึกคืนอุปกรณ์
                </button>
              )}
              <button
                onClick={handleDeleteLoan}
                disabled={saving}
                className="text-sm font-semibold text-red-500 hover:underline disabled:opacity-50"
              >
                ลบรายการ
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-12">
          {/* Status & ID */}
          <div className="flex gap-8 border-b border-gray-100 pb-8 mt-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                สถานะ
              </p>
              <p className={`text-sm font-bold ${currentStatus.color}`}>
                {currentStatus.label}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                รหัสรายการ
              </p>
              <p className="text-sm font-bold">#{loan.id}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                จำนวน
              </p>
              <p className="text-sm font-bold">{loan.quantity} ชิ้น</p>
            </div>
          </div>

          {/* Device Detail */}
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-4">
              ข้อมูลอุปกรณ์
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">
                  รายละเอียดเพิ่มเติม / Serial
                </p>
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {loan.description || "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Borrower Detail */}
          <section className="pt-8 border-t border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 mb-6">
              ข้อมูลผู้ยืม
            </h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div>
                <p className="text-xs text-gray-400 mb-1">ชื่อผู้ยืม</p>
                <p className="text-sm font-medium text-gray-900">
                  {loan.borrowerName || loan.borrowedBy.name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">แผนก</p>
                <p className="text-sm font-medium text-gray-900">
                  {loan.borrowerDepartment || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">เบอร์ติดต่อ</p>
                <p className="text-sm font-medium text-gray-900">
                  {loan.borrowerPhone || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Line ID</p>
                <p className="text-sm font-medium text-gray-900">
                  {loan.borrowerLineId ? `@${loan.borrowerLineId}` : "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="pt-8 border-t border-gray-100 pb-10">
            <h2 className="text-sm font-bold text-gray-900 mb-6">บันทึกเวลา</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">วันที่ยืม</span>
                <span className="font-medium text-gray-900">
                  {safeFormat(loan.borrowDate, "dd MMM yyyy HH:mm น.")}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">กำหนดคืน</span>
                <span className="font-medium text-gray-900">
                  {safeFormat(loan.expectedReturnDate, "dd MMM yyyy")}
                </span>
              </div>
              {loan.returnDate && (
                <div className="flex justify-between items-center text-sm pt-4 border-t border-gray-50 border-dashed">
                  <span className="text-emerald-600 font-semibold">
                    คืนอุปกรณ์แล้วเมื่อ
                  </span>
                  <span className="font-bold text-emerald-600">
                    {safeFormat(loan.returnDate, "dd MMM yyyy HH:mm น.")}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Footer Info */}
          <div className="pt-10 border-t border-gray-100">
            <p className="text-[10px] text-gray-300 font-medium uppercase tracking-widest text-center">
              Last updated by {loan.borrowedBy.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
