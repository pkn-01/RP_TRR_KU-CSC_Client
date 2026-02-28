import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { apiFetch } from "@/services/api";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X as XIcon,
  Package,
  User,
  Check,
  Phone,
  Building,
  AtSign,
} from "lucide-react";
import Loading from "@/components/Loading";
import { safeFormat } from "@/lib/date-utils";

interface Loan {
  id: number;
  itemName: string;
  description?: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate?: string;
  status: "BORROWED" | "RETURNED" | "PENDING" | "OVERDUE";
  borrowedBy: {
    id: number;
    name: string;
    department?: string;
    phoneNumber?: string;
    lineId?: string;
    email?: string;
  };
  borrowerName?: string;
  borrowerDepartment?: string;
  borrowerPhone?: string;
  borrowerLineId?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  BORROWED: { label: "กำลังยืม", color: "text-amber-700", bg: "bg-amber-50" },
  RETURNED: { label: "คืนสำเร็จ", color: "text-green-700", bg: "bg-green-50" },
  PENDING: { label: "รออนุมัติ", color: "text-blue-700", bg: "bg-blue-50" },
  OVERDUE: { label: "เกินกำหนด", color: "text-red-700", bg: "bg-red-50" },
};

function LoanDetailModal({
  loanId,
  onClose,
  onUpdate,
}: {
  loanId: number;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchLoanDetail = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch(`/api/loans/${loanId}`);
      setLoan(data);
    } catch (err: any) {
      console.error("Failed to fetch loan details:", err);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [loanId, onClose]);

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

      onUpdate();
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
      text: "คุณต้องการลบรายการยืมนี้ใช่หรือไม่?",
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

      onUpdate();
      onClose();
    } catch (err: any) {
      Swal.fire("ผิดพลาด", err.message || "ไม่สามารถลบได้", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl p-12 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-gray-500">
              กำลังโหลดข้อมูล...
            </p>
          </div>
        </div>
      </div>
    );

  if (!loan) return null;

  const currentStatus = statusConfig[loan.status] || {
    label: loan.status,
    color: "text-gray-600",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 p-2 rounded-full"
        >
          <XIcon size={20} />
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-10 pr-12">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              รายละเอียดการยืมอุปกรณ์
            </p>
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight leading-tight">
              {loan.itemName}
            </h2>
            <div className="flex items-center gap-6 mt-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  สถานะ
                </p>
                <p className={`text-sm font-bold ${currentStatus.color}`}>
                  {currentStatus.label}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  รหัส
                </p>
                <p className="text-sm font-bold text-gray-900">#{loan.id}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  จำนวน
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {loan.quantity} ชิ้น
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10">
            {/* Description */}
            <section>
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">
                ข้อมูลอุปกรณ์
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {loan.description || "— ไม่มีรายละเอียดเพิ่มเติม —"}
              </p>
            </section>

            {/* Borrower */}
            <section className="pt-8 border-t border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-6">
                ข้อมูลผู้ยืม
              </h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    ชื่อผู้ยืม
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {loan.borrowerName || loan.borrowedBy.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    แผนก
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {loan.borrowerDepartment ||
                      loan.borrowedBy.department ||
                      "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    เบอร์ติดต่อ
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {loan.borrowerPhone || loan.borrowedBy.phoneNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                    Line ID
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {loan.borrowerLineId
                      ? `@${loan.borrowerLineId}`
                      : loan.borrowedBy.lineId
                        ? `@${loan.borrowedBy.lineId}`
                        : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Timeline */}
            <section className="pt-8 border-t border-gray-100">
              <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-6">
                บันทึกเวลา
              </h3>
              <div className="space-y-4">
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
                    <span className="text-emerald-600 font-bold">
                      คืนอุปกรณ์แล้ว
                    </span>
                    <span className="font-bold text-emerald-600">
                      {safeFormat(loan.returnDate, "dd MMM yyyy HH:mm น.")}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Actions */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-end gap-6">
            <button
              onClick={handleDeleteLoan}
              disabled={saving}
              className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors disabled:opacity-50"
            >
              ลบรายการ
            </button>
            {loan.status !== "RETURNED" && (
              <button
                onClick={handleReturnItem}
                disabled={saving}
                className="px-8 py-3 bg-gray-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-gray-200"
              >
                {saving ? "กำลังบันทึก..." : "ยืนยันการคืนอุปกรณ์"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoansContent() {
  const searchParams = useSearchParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    quantity: 1,
    borrowerName: "",
    department: "",
    phoneNumber: "",
    lineId: "",
  });

  const itemsPerPage = 10;

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Stats
  const stats = {
    total: loans.length,
    active: loans.filter(
      (l) => l.status === "BORROWED" || l.status === "OVERDUE",
    ).length,
    returned: loans.filter((l) => l.status === "RETURNED").length,
  };

  // Read status from URL
  useEffect(() => {
    const status = searchParams.get("status");
    if (status) {
      setFilterStatus(status);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/api/loans/admin/all");
      setLoans(data || []);
    } catch (err) {
      console.error("Failed to fetch loans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (loanId: number) => {
    const result = await Swal.fire({
      title: "ลบรายการยืมนี้?",
      text: "การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/loans/${loanId}`, { method: "DELETE" });
      await Swal.fire("ลบสำเร็จ!", "รายการยืมถูกลบแล้ว", "success");
      fetchLoans();
    } catch {
      Swal.fire("ผิดพลาด", "เกิดข้อผิดพลาดในการลบ", "error");
    }
  };

  const handleAddLoan = async () => {
    if (!formData.itemName || !formData.borrowerName) {
      return;
    }

    try {
      setIsSaving(true);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          itemName: formData.itemName,
          description: formData.description || "",
          quantity: formData.quantity || 1,
          borrowDate: today.toISOString(),
          expectedReturnDate: nextWeek.toISOString(),
          borrowerName: formData.borrowerName,
          department: formData.department,
          phoneNumber: formData.phoneNumber,
          lineId: formData.lineId,
        }),
      });
      setShowModal(false);
      setFormData({
        itemName: "",
        description: "",
        quantity: 1,
        borrowerName: "",
        department: "",
        phoneNumber: "",
        lineId: "",
      });
      fetchLoans();
    } catch (err: any) {
      Swal.fire("เกิดข้อผิดพลาด", err.message || "ไม่สามารถบันทึกได้", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      loan.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrowedBy?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.borrowerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || loan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              จัดการรายการยืม
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              ติดตามและบันทึกข้อมูลการยืมอุปกรณ์สำนักงาน
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-md shadow-gray-200 flex items-center gap-2"
            >
              <Plus size={18} />
              เพิ่มรายการยืม
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatCard label="รายการยืมทั้งหมด" value={stats.total} type="total" />
          <StatCard label="กำลังยืม" value={stats.active} type="active" />
          <StatCard
            label="คืนสำเร็จแล้ว"
            value={stats.returned}
            type="returned"
          />
        </div>

        {/* Filters Layer */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="ค้นหาอุปกรณ์ / ผู้ยืม..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-gray-200 focus:outline-none transition-all"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-gray-200 focus:outline-none transition-all font-medium"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="BORROWED">กำลังยืม</option>
              <option value="RETURNED">คืนแล้ว</option>
              <option value="OVERDUE">เกินกำหนด</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  อุปกรณ์
                </th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  ชื่อผู้ยืม
                </th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  วันที่ยืม
                </th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">
                  สถานะ
                </th>
                <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedLoanId(loan.id)}
                >
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-gray-900">
                      {loan.itemName}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-gray-600">
                      {loan.borrowerName || loan.borrowedBy?.name || "-"}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-gray-400">
                      {safeFormat(loan.borrowDate, "dd MMM yyyy")}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg font-bold ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                    >
                      {statusConfig[loan.status]?.label || loan.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div
                      className="flex items-center justify-end gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setSelectedLoanId(loan.id)}
                        className="p-2 text-gray-300 hover:text-gray-900 transition-colors"
                      >
                        <ChevronRight size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLoans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-sm text-gray-400 font-medium tracking-tight">
                      ไม่พบรายการยืมในขณะนี้
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {paginatedLoans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
              onClick={() => setSelectedLoanId(loan.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-base font-bold text-gray-900">
                  {loan.itemName}
                </h3>
                <span
                  className={`text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg font-bold ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                >
                  {statusConfig[loan.status]?.label || loan.status}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">ผู้ยืม</span>
                  <span className="text-gray-900 font-bold">
                    {loan.borrowerName || loan.borrowedBy?.name || "-"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">วันที่ยืม</span>
                  <span className="text-gray-900 font-bold">
                    {safeFormat(loan.borrowDate, "dd MMM yyyy")}
                  </span>
                </div>
              </div>
              <div
                className="flex justify-between gap-3 pt-4 border-t border-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => handleDelete(loan.id)}
                  className="flex-1 py-2 text-xs font-bold text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                >
                  ลบรายการ
                </button>
                <button
                  onClick={() => setSelectedLoanId(loan.id)}
                  className="flex-1 py-2 text-xs font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  รายละเอียด
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 pt-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 disabled:opacity-20 transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white rounded-2xl border border-transparent hover:border-gray-100 disabled:opacity-20 transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-0 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-10 py-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                  บันทึกการยืมใหม่
                </h2>
                <p className="text-sm text-gray-400 font-medium mt-1">
                  ระบุข้อมูลที่จำเป็นเพื่อบันทึกรายการ
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full"
              >
                <XIcon size={22} />
              </button>
            </div>

            <div className="px-10 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Device Info */}
                <div className="space-y-8">
                  <div className="pb-2 border-b border-gray-50">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                      ข้อมูลอุปกรณ์
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData({ ...formData, itemName: e.target.value })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
                        placeholder="ระบุชื่ออุปกรณ์..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        รายละเอียด / Serial No.
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300 resize-none"
                        placeholder="ระบุรายละเอียดอุปกรณ์..."
                      />
                    </div>

                    <div className="w-40">
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        จำนวน
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            quantity: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-gray-200 focus:outline-none transition-all text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Borrower Info */}
                <div className="space-y-8">
                  <div className="pb-2 border-b border-gray-50">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                      ข้อมูลผู้ยืม
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        ชื่อผู้ยืม <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.borrowerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            borrowerName: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
                        placeholder="ระบุชื่อจริง-นามสกุล..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                        แผนก
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            department: e.target.value,
                          })
                        }
                        className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
                        placeholder="ระบุแผนก..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                          เบอร์โทรศัพท์
                        </label>
                        <input
                          type="text"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
                          placeholder="0xx-xxx-xxxx"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                          Line ID
                        </label>
                        <input
                          type="text"
                          value={formData.lineId}
                          onChange={(e) =>
                            setFormData({ ...formData, lineId: e.target.value })
                          }
                          className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-gray-200 focus:outline-none transition-all placeholder:text-gray-300"
                          placeholder="@username"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      onClick={handleAddLoan}
                      disabled={
                        isSaving || !formData.itemName || !formData.borrowerName
                      }
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30 shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                    >
                      {isSaving ? "กำลังบันทึก..." : "ยืนยันการบันทึกข้อมูล"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLoanId && (
        <LoanDetailModal
          loanId={selectedLoanId}
          onClose={() => setSelectedLoanId(null)}
          onUpdate={fetchLoans}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "total" | "active" | "returned";
}) {
  const styles = {
    total: "text-gray-900 border-gray-200 bg-white",
    active: "text-amber-600 border-amber-100 bg-white",
    returned: "text-emerald-600 border-emerald-100 bg-white",
  };

  return (
    <div
      className={`p-8 rounded-2xl border shadow-sm transition-all hover:shadow-md ${styles[type]}`}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 mb-2">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tracking-tighter">{value}</span>
        <span className="text-xs font-bold mb-1.5 uppercase opacity-40">
          รายการ
        </span>
      </div>
    </div>
  );
}

export default function AdminLoansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminLoansContent />
    </Suspense>
  );
}
