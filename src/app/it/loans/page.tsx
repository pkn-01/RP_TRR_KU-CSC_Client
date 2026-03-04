import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { apiFetch } from "@/services/api";
import * as XLSX from "xlsx";
import {
  Search,
  Plus,
  Check,
  Trash2,
  RefreshCw,
  Package,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Building2,
  Phone,
  X,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  X as XIcon,
} from "lucide-react";
import Loading from "@/components/Loading";
import { safeFormat } from "@/lib/date-utils";

// --- Types ---
type LoanStatus = "BORROWED" | "RETURNED" | "OVERDUE";

interface Loan {
  id: number;
  itemName: string;
  description: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate?: string;
  status: LoanStatus;
  borrowerName: string;
  borrowerDepartment: string;
  borrowerPhone: string;
  borrowerLineId: string;
  borrowedBy: {
    name: string;
    email: string;
  };
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  BORROWED: { label: "กำลังยืม", color: "text-amber-700", bg: "bg-amber-50" },
  RETURNED: { label: "คืนสำเร็จ", color: "text-green-700", bg: "bg-green-50" },
  OVERDUE: { label: "เลยกำหนด", color: "text-red-700", bg: "bg-red-50" },
};

function ITLoansContent() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    quantity: 1 as number | string,
    borrowerName: "",
    borrowerDepartment: "",
    borrowerPhone: "",
    borrowerLineId: "",
  });

  const fetchLoans = useCallback(async () => {
    try {
      const token =
        localStorage.getItem("access_token") || localStorage.getItem("token");
      if (!token) {
        router.push("/login/admin");
        return;
      }

      setLoading(true);
      const data = await apiFetch("/api/loans/admin/all");
      setLoans(data || []);
    } catch (err) {
      console.error("Failed to fetch loans:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const searchParams = useSearchParams();
  const urlStatus = searchParams.get("status");

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status) {
      setFilterStatus(status);
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      const searchStr =
        `${loan.itemName} ${loan.borrowerName} ${loan.borrowerDepartment}`.toLowerCase();
      return (
        searchStr.includes(searchTerm.toLowerCase()) &&
        (filterStatus === "all" || loan.status === filterStatus)
      );
    });
  }, [loans, searchTerm, filterStatus]);

  const stats = useMemo(
    () => ({
      total: loans.length,
      active: loans.filter(
        (l) => l.status === "BORROWED" || l.status === "OVERDUE",
      ).length,
      returned: loans.filter((l) => l.status === "RETURNED").length,
    }),
    [loans],
  );

  const handleReturnItem = async (loanId: number) => {
    const result = await Swal.fire({
      title: "คืนอุปกรณ์ขิ้นนี้?",
      text: "คุณยืนยันว่าได้รับอุปกรณ์คืนแล้วใช่หรือไม่?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ยืนยันการคืน",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/loans/${loanId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "RETURNED",
          returnDate: new Date().toISOString(),
        }),
      });
      await Swal.fire("สำเร็จ!", "บันทึกการคืนเรียบร้อยแล้ว", "success");
      fetchLoans();
    } catch (err: any) {
      Swal.fire(
        "ผิดพลาด",
        err.message || "เกิดข้อผิดพลาดในการบันทึกการคืน",
        "error",
      );
    }
  };

  const handleDeleteLoan = async (loanId: number) => {
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
      setSubmitting(true);
      const today = new Date();
      await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          itemName: formData.itemName,
          description: formData.description || "",
          quantity: formData.quantity || 1,
          borrowDate: today.toISOString(),
          borrowerName: formData.borrowerName,
          borrowerDepartment: formData.borrowerDepartment,
          borrowerPhone: formData.borrowerPhone,
          borrowerLineId: formData.borrowerLineId,
        }),
      });

      setShowModal(false);
      setFormData({
        itemName: "",
        description: "",
        quantity: 1 as number | string,
        borrowerName: "",
        borrowerDepartment: "",
        borrowerPhone: "",
        borrowerLineId: "",
      });
      fetchLoans();
      await Swal.fire("สำเร็จ!", "บันทึกการยืมเรียบร้อยแล้ว", "success");
    } catch (err: any) {
      Swal.fire("เกิดข้อผิดพลาด", err.message || "ไม่สามารถบันทึกได้", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (filteredLoans.length === 0) {
      Swal.fire("ไม่มีข้อมูล", "ไม่พบรายการที่ตรงตามตัวกรอง", "info");
      return;
    }

    try {
      const metadata = [
        { อุปกรณ์: "รายงานการยืม-คืนอุปกรณ์ (IT)", รายละเอียด: "" },
        {
          อุปกรณ์: "วันที่ส่งออก:",
          รายละเอียด: new Date().toLocaleString("th-TH"),
        },
        {
          อุปกรณ์: "ตัวกรองปัจจุบัน:",
          รายละเอียด: searchTerm ? `ค้นหา: ${searchTerm}` : "ทั้งหมด",
        },
        {
          อุปกรณ์: "สถานะ:",
          รายละเอียด:
            filterStatus === "all"
              ? "ทั้งหมด"
              : statusConfig[filterStatus]?.label,
        },
        { อุปกรณ์: "", รายละเอียด: "" },
      ];

      const loanData = filteredLoans.map((loan) => ({
        อุปกรณ์: loan.itemName,
        รายละเอียด: loan.description || "-",
        จำนวน: loan.quantity,
        ชื่อผู้ยืม: loan.borrowerName || (loan.borrowedBy as any)?.name || "-",
        แผนก:
          loan.borrowerDepartment ||
          (loan.borrowedBy as any)?.department ||
          "-",
        เบอร์โทรศัพท์:
          loan.borrowerPhone || (loan.borrowedBy as any)?.phoneNumber || "-",
        LineID: loan.borrowerLineId || (loan.borrowedBy as any)?.lineId || "-",
        สถานะ: statusConfig[loan.status]?.label || loan.status,
        วันที่ยืม: new Date(loan.borrowDate).toLocaleString("th-TH"),
        วันที่คืน: loan.returnDate
          ? new Date(loan.returnDate).toLocaleString("th-TH")
          : "-",
      }));

      const exportData = [...metadata, ...loanData];
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Loan Report");
      const date = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `รายงานการยืม-ไอที-${date}.xlsx`);
      Swal.fire("สำเร็จ!", "ส่งออกรายงานเรียบร้อยแล้ว", "success");
    } catch (err) {
      console.error("Export failed:", err);
      Swal.fire("ผิดพลาด", "ไม่สามารถส่งออกรายงานได้", "error");
    }
  };

  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = filteredLoans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="รายการยืมทั้งหมด (IT)" value={stats.total} />
          <StatCard label="กำลังยืม" value={stats.active} />
          <StatCard label="คืนสำเร็จแล้ว" value={stats.returned} />
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ค้นหาชื่ออุปกรณ์/ชื่อผู้ยืม"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="BORROWED">กำลังยืม</option>
              <option value="RETURNED">คืนแล้ว</option>
            </select>
            <button
              onClick={fetchLoans}
              className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <Plus size={16} />
              เพิ่มรายการยืม
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  อุปกรณ์
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  ชื่อผู้ยืม
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  วันที่ยืม
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  สถานะ
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600 text-right">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {loan.itemName}
                      </span>
                      {loan.description && (
                        <span className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {loan.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 font-medium">
                        {loan.borrowerName || (loan.borrowedBy as any)?.name || "-"}
                      </span>
                      {loan.borrowerDepartment && (
                        <span className="text-xs text-gray-500 mt-1">
                          {loan.borrowerDepartment}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700">
                        {new Date(loan.borrowDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(loan.borrowDate).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                    >
                      {statusConfig[loan.status]?.label || loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowDetailModal(true);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="ดูรายละเอียด"
                      >
                        <FileText size={18} />
                      </button>
                      {loan.status !== "RETURNED" && (
                        <button
                          onClick={() => handleReturnItem(loan.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="คืนอุปกรณ์"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        title="ลบ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLoans.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center"
                  >
                    <EmptyState />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {paginatedLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 leading-tight">
                    {loan.itemName}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">
                    {loan.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                >
                  {statusConfig[loan.status]?.label || loan.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User size={14} className="text-gray-400" />
                  <span className="font-semibold">{loan.borrowerName || (loan.borrowedBy as any)?.name || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                   <Building2 size={14} className="text-gray-400" />
                   <span>{loan.borrowerDepartment || "-"}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                   <Calendar size={14} className="text-gray-400" />
                   <span>{new Date(loan.borrowDate).toLocaleDateString("th-TH")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setSelectedLoan(loan);
                    setShowDetailModal(true);
                  }}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 active:scale-95 transition-all shadow-sm"
                >
                  <FileText size={18} />
                </button>
                {loan.status !== "RETURNED" && (
                  <button
                    onClick={() => handleReturnItem(loan.id)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 active:scale-95 transition-all shadow-sm"
                  >
                    <Check size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLoan(loan.id)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 active:scale-95 transition-all shadow-sm"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
          {paginatedLoans.length === 0 && <EmptyState />}
        </div>

        {/* Pagination Controls */}
        {totalPages > 0 && (
          <div className="flex items-center justify-end gap-3 pb-6">
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="p-2 text-gray-800 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-xl p-0 max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-blue-600" size={24} />
                รายละเอียดการยืม
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
              {/* Item Info */}
              <div className="bg-gray-50/80 p-6 rounded-2xl border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {selectedLoan.itemName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <Package size={16} />
                    จำนวน: {selectedLoan.quantity} รายการ
                  </div>
                  {selectedLoan.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">รายละเอียด</p>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium">
                        {selectedLoan.description}
                      </p>
                    </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                {/* Borrower Info */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} className="text-blue-500" />
                    ข้อมูลผู้ยืม
                  </h4>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">ชื่อ-นามสกุล</span>
                      <span className="text-sm text-gray-800 font-semibold">
                        {selectedLoan.borrowerName || (selectedLoan.borrowedBy as any)?.name}
                      </span>
                    </div>
                    {(selectedLoan.borrowerDepartment || (selectedLoan.borrowedBy as any)?.department) && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">แผนก/ส่วนงาน</span>
                        <span className="text-sm text-gray-800 font-medium">
                          {selectedLoan.borrowerDepartment || (selectedLoan.borrowedBy as any)?.department}
                        </span>
                      </div>
                    )}
                    {(selectedLoan.borrowerPhone || (selectedLoan.borrowedBy as any)?.phoneNumber) && (
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 uppercase font-bold">เบอร์โทรศัพท์</span>
                        <span className="text-sm text-gray-800 font-medium font-mono">
                          {selectedLoan.borrowerPhone || (selectedLoan.borrowedBy as any)?.phoneNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Info */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" />
                    ระยะเวลาการยืม
                  </h4>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 uppercase font-bold">วันที่ยืม</span>
                      <span className="text-sm text-gray-800 font-semibold">
                        {new Date(selectedLoan.borrowDate).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {selectedLoan.returnDate ? (
                      <div className="flex flex-col p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-emerald-600 uppercase font-extrabold">คืนสำเร็จเมื่อ</span>
                        <span className="text-sm text-emerald-700 font-bold">
                          {new Date(selectedLoan.returnDate).toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ) : (
                       <div className="flex flex-col">
                        <span className="text-[10px] text-amber-600 uppercase font-bold">สถานะปัจจุบัน</span>
                        <span className="text-sm text-amber-700 font-bold flex items-center gap-1.5 mt-0.5">
                          <Clock size={14} />
                          กำลังถูกยืม
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3">
              {selectedLoan.status !== "RETURNED" && (
                <button
                  onClick={() => {
                    handleReturnItem(selectedLoan.id);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Check size={18} />
                  ยืนยันการคืนอุปกรณ์
                </button>
              )}
               <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
                >
                  ปิด
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="text-blue-600" size={24} />
                บันทึกการยืมใหม่
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black p-2 hover:bg-gray-100 rounded-full transition-all"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Side: Item Info */}
                <div className="space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-3 flex items-center gap-2">
                    <Package size={16} />
                    ข้อมูลอุปกรณ์
                  </h3>
                  <div className="space-y-5">
                    <FormInput
                      label="ชื่ออุปกรณ์"
                      required
                      value={formData.itemName}
                      onChange={(v) =>
                        setFormData({ ...formData, itemName: v })
                      }
                      placeholder="เช่น โน๊ตบุ๊ค, จอมอนิเตอร์"
                    />
                    <FormTextArea
                      label="รายละเอียด"
                      value={formData.description}
                      onChange={(v) =>
                        setFormData({ ...formData, description: v })
                      }
                      placeholder="เช่น ยี่ห้อ, รุ่น หรือสภาพอุปกรณ์"
                    />
                    <div className="w-1/3">
                      <FormInput
                        label="จำนวน"
                        type="number"
                        value={formData.quantity.toString()}
                        onChange={(v) =>
                          setFormData({
                            ...formData,
                            quantity: parseInt(v) || 1,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Right Side: Borrower Info */}
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 space-y-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-3 flex items-center gap-2">
                    <User size={16} />
                    ข้อมูลผู้ยืม
                  </h3>
                  <div className="space-y-5">
                    <FormInput
                      label="ชื่อ-นามสกุล ผู้ยืม"
                      required
                      value={formData.borrowerName}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerName: v })
                      }
                      placeholder="ระบุชื่อผู้ยืม"
                    />
                    <FormInput
                      label="แผนก"
                      value={formData.borrowerDepartment}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerDepartment: v })
                      }
                      placeholder="เช่น ฝ่ายบัญชี, IT"
                    />
                    <FormInput
                      label="เบอร์โทรศัพท์"
                      value={formData.borrowerPhone}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerPhone: v })
                      }
                      placeholder="0xx-xxx-xxxx"
                    />
                    <FormInput
                      label="Line ID"
                      value={formData.borrowerLineId}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerLineId: v })
                      }
                      placeholder="@lineid"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 text-gray-700 font-bold hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all active:scale-95 shadow-sm sm:shadow-none"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddLoan}
                disabled={submitting || !formData.itemName || !formData.borrowerName}
                className="flex-[2] py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Check size={20} strokeWidth={2.5} />
                )}
                ยืนยันการบันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Internal UI Helpers ---

function FormInput({
  label,
  type = "text",
  required,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-black mb-2 flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${
            icon ? "pl-9" : "px-4"
          } py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 outline-none transition-all text-black font-medium placeholder-gray-400 text-sm`}
        />
      </div>
    </div>
  );
}

function FormTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-black mb-2">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 outline-none transition-all text-black font-medium placeholder-gray-400 text-sm resize-none"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const colorMap: Record<string, string> = {
    "รายการยืมทั้งหมด (IT)": "bg-blue-600 text-white",
    กำลังยืม: "bg-amber-500 text-white",
    คืนสำเร็จแล้ว: "bg-emerald-600 text-white",
  };

  const colorClass = colorMap[label] || "bg-blue-600 text-white";

  return (
    <div
      className={`flex flex-col items-center justify-center p-5 min-w-0 w-full rounded-xl shadow-md transition-all hover:scale-[1.02] ${colorClass}`}
    >
      <span className="text-xs sm:text-sm mb-1 text-center whitespace-nowrap font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-2xl sm:text-4xl font-black tracking-tight">{value}</span>
    </div>
  );
}

export default function ITLoansPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ITLoansContent />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center bg-white gap-5">
      <div className="relative flex items-center justify-center w-12 h-12">
        <div className="absolute inset-0 w-full h-full border-[3px] border-gray-100 rounded-full"></div>
        <div className="absolute inset-0 w-full h-full border-[3px] border-gray-900 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-bold text-gray-900 text-sm tracking-wide">
          กำลังโหลดข้อมูล
        </p>
        <p className="text-xs font-medium text-gray-500">กรุณารอสักครู่...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-center">
      <Package size={48} className="text-gray-300 mb-4" />
      <h3 className="text-black font-bold text-lg">ไม่พบรายการยืมอุปกรณ์</h3>
      <p className="text-gray-600 font-medium mt-2 text-sm">
        เริ่มต้นโดยการคลิกปุ่ม &apos;เพิ่มรายการใหม่&apos;
      </p>
    </div>
  );
}
