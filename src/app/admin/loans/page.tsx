"use client";

import { useState, useEffect, Suspense } from "react";
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
  Clock,
  Calendar,
  FileText,
  Briefcase,
  Hash,
  RefreshCw,
} from "lucide-react";
import Loading from "@/components/Loading";

interface Loan {
  id: number;
  itemName: string;
  description?: string;
  quantity: number;
  borrowDate: string;
  expectedReturnDate: string;
  returnDate?: string;
  status: "BORROWED" | "RETURNED" | "PENDING";
  borrowedBy: {
    id: number;
    name: string;
    department?: string;
    phoneNumber?: string;
    lineId?: string;
  };
  borrowerName?: string;
  department?: string;
  phoneNumber?: string;
  lineId?: string;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  BORROWED: { label: "กำลังยืม", color: "text-amber-700", bg: "bg-amber-50" },
  RETURNED: { label: "คืนสำเร็จ", color: "text-green-700", bg: "bg-green-50" },
  PENDING: { label: "รออนุมัติ", color: "text-blue-700", bg: "bg-blue-50" },
};

function AdminLoansContent() {
  const searchParams = useSearchParams();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
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
    active: loans.filter((l) => l.status === "BORROWED").length,
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
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
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

  const handleReturnLoan = async (loanId: number) => {
    const result = await Swal.fire({
      title: "ยืนยันการรับคืน?",
      text: "อุปกรณ์นี้ถูกส่งคืนเรียบร้อยแล้วใช่หรือไม่",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10B981",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "ใช่, รับคืนแล้ว",
      cancelButtonText: "ยกเลิก",
    });

    if (!result.isConfirmed) return;

    try {
      setIsSaving(true);
      await apiFetch(`/api/loans/${loanId}/return`, { method: "PUT" });
      await Swal.fire("สำเร็จ!", "บันทึกการรับคืนเรียบร้อย", "success");
      setShowDetailModal(false);
      fetchLoans();
    } catch (err: any) {
      Swal.fire("ข้อผิดพลาด", err.message || "ไม่สามารถทำรายการได้", "error");
    } finally {
      setIsSaving(false);
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
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="รายการยืมทั้งหมด" value={stats.total} />
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
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 flex items-center gap-1"
            >
              <Plus size={16} />
              เพิ่มรายการยืม
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50">
              Export reprot
            </button>
          </div>
        </div>

        {/* List Header (Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-y border-gray-200 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          <div className="col-span-6 ml-1">อุปกรณ์</div>
          <div className="col-span-2 text-center">ผู้รับผิดชอบ</div>
          <div className="col-span-2 text-center">กำหนดคืน</div>
          <div className="col-span-1 text-center">สถานะ</div>
          <div className="col-span-1"></div>
        </div>

        {/* List Content */}
        <div className="space-y-3">
          {paginatedLoans.map((loan) => (
            <div
              key={loan.id}
              className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Device Info */}
                <div className="col-span-1 md:col-span-6 space-y-1">
                  <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {loan.itemName}
                  </h3>
                  {loan.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 max-w-xl">
                      {loan.description}
                    </p>
                  )}
                </div>

                {/* Responsible Person */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center space-y-1 text-center">
                  <div className="flex items-center gap-1.5 text-[13px] text-gray-600 font-medium">
                    <User size={14} className="text-gray-400" />
                    <span>
                      {loan.borrowerName || loan.borrowedBy?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                    <Building size={12} />
                    <span>
                      {loan.department || loan.borrowedBy?.department || "-"}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center space-y-1 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-gray-700">
                      {new Date(loan.expectedReturnDate).toLocaleDateString(
                        "th-TH",
                        {
                          day: "2-digit",
                          month: "short",
                        },
                      )}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(loan.expectedReturnDate).getFullYear() + 543}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex flex-col items-center">
                    <span>ยืมเมื่อ:</span>
                    <span>
                      {new Date(loan.borrowDate).toLocaleDateString("th-TH", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1 md:col-span-1 flex justify-center">
                  <div
                    className={`flex flex-col items-center justify-center gap-1.5 min-w-[70px] py-2 px-3 rounded-lg border transition-colors ${
                      loan.status === "BORROWED"
                        ? "bg-gray-900 border-gray-800 text-white"
                        : "bg-green-50 border-green-100 text-green-700"
                    }`}
                  >
                    {loan.status === "BORROWED" ? (
                      <>
                        <Clock
                          size={14}
                          className="animate-pulse text-amber-500"
                        />
                        <span className="text-[10px] font-bold">กำลังยืม</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span className="text-[10px] font-bold">คืนแล้ว</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 md:col-span-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setSelectedLoan(loan);
                      setShowDetailModal(true);
                    }}
                    className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm"
                    title="ดูรายละเอียด"
                  >
                    <FileText size={16} />
                  </button>
                  {loan.status === "BORROWED" && (
                    <button
                      onClick={() => handleReturnLoan(loan.id)}
                      className="p-2 bg-white border border-gray-200 hover:bg-green-600 hover:text-white text-gray-400 rounded-lg transition-all shadow-sm group/return"
                      title="รับคืน"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(loan.id)}
                    className="p-2 bg-white border border-gray-200 hover:bg-red-500 hover:text-white text-gray-400 rounded-lg transition-all shadow-sm"
                    title="ลบ"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {paginatedLoans.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-100 p-12 text-center text-gray-400 space-y-2">
              <Package size={32} className="mx-auto opacity-20" />
              <p className="text-sm">ไม่พบรายการยืมในขณะนี้</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-700">
              {currentPage}/{totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-0 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <Plus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">
                    บันทึกการยืมใหม่
                  </h2>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    New Borrowing Entry
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 p-2.5 rounded-xl"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Device Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Package size={16} className="text-gray-400" />
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                      ข้อมูลอุปกรณ์
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                      ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.itemName}
                      onChange={(e) =>
                        setFormData({ ...formData, itemName: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all placeholder:text-gray-300 font-medium"
                      placeholder="ระบุชื่ออุปกรณ์ที่ต้องการยืม"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                      รายละเอียด/Serial No.
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all placeholder:text-gray-300 font-medium resize-none"
                      placeholder="ระบุเลข Serial หรือรายละเอียดทางเทคนิคเพิ่มเติม"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                      จำนวน (อัตราหน่วย)
                    </label>
                    <div className="flex items-center gap-3">
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
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all font-bold text-left"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column: Borrower Info */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <User size={16} className="text-gray-400" />
                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">
                      ข้อมูลผู้ยืม
                    </h3>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                      ชื่อผู้ยืม <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        value={formData.borrowerName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            borrowerName: e.target.value,
                          })
                        }
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 transition-all font-medium"
                        placeholder="ระบุชื่อจริง-นามสกุล"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                      หน่วยงาน/แผนก
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                        <Building size={18} />
                      </div>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            department: e.target.value,
                          })
                        }
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 transition-all font-medium"
                        placeholder="สังกัดหน่วยงาน"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                        เบอร์ติดต่อ
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                          <Phone size={18} />
                        </div>
                        <input
                          type="text"
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              phoneNumber: e.target.value,
                            })
                          }
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 transition-all font-medium"
                          placeholder="0xx-xxx-xxxx"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-tight">
                        LINE ID
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors">
                          <AtSign size={18} />
                        </div>
                        <input
                          type="text"
                          value={formData.lineId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              lineId: e.target.value,
                            })
                          }
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500/50 transition-all font-medium"
                          placeholder="ID / Username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-4 mt-auto">
              <button
                onClick={() => setShowModal(false)}
                className="px-8 py-3.5 bg-white border border-gray-200 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-50 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddLoan}
                disabled={
                  isSaving || !formData.itemName || !formData.borrowerName
                }
                className="px-10 py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-gray-200 flex items-center gap-3"
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    บันทึกข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-0 max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100">
              <div>
                <h2 className="text-[22px] font-bold text-gray-900">
                  รายละเอียดการยืม
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Tracking Number:
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    # {selectedLoan.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 transition-all hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-900"
              >
                <XIcon size={24} />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Item Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-900 mb-1">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Package size={18} />
                  </div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">
                    ข้อมูลอุปกรณ์
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-8 pl-11">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      ชื่ออุปกรณ์
                    </label>
                    <p className="text-[15px] font-bold text-gray-800 leading-tight">
                      {selectedLoan.itemName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      จำนวน
                    </label>
                    <p className="text-[15px] font-bold text-gray-800">
                      {selectedLoan.quantity} ชิ้น
                    </p>
                  </div>
                  {selectedLoan.description && (
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        รายละเอียด
                      </label>
                      <p className="text-[13px] font-medium text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {selectedLoan.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Borrower Info Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-900 mb-1">
                  <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                    <User size={18} />
                  </div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">
                    ผู้ยืม
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-8 pl-11">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      ชื่อ-นามสกุล
                    </label>
                    <p className="text-[15px] font-bold text-gray-800">
                      {selectedLoan.borrowerName ||
                        selectedLoan.borrowedBy?.name ||
                        "-"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      แผนก
                    </label>
                    <p className="text-[15px] font-bold text-gray-800">
                      {selectedLoan.department ||
                        selectedLoan.borrowedBy?.department ||
                        "-"}
                    </p>
                  </div>
                  {selectedLoan.phoneNumber && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        เบอร์โทรศัพท์
                      </label>
                      <p className="text-[13px] font-bold text-gray-700">
                        {selectedLoan.phoneNumber}
                      </p>
                    </div>
                  )}
                  {selectedLoan.lineId && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                        Line ID
                      </label>
                      <p className="text-[13px] font-bold text-gray-700">
                        {selectedLoan.lineId}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Section */}
              <div className="space-y-4 border-t border-gray-100 pt-8">
                <div className="flex items-center gap-3 text-gray-900 mb-1">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                    <Calendar size={18} />
                  </div>
                  <h3 className="font-bold text-lg uppercase tracking-tight">
                    วันที่ทำรายการ
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-8 pl-11">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      วันที่ยืม
                    </label>
                    <p className="text-[14px] font-bold text-gray-800">
                      {new Date(selectedLoan.borrowDate).toLocaleDateString(
                        "th-TH",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      วันคืนพัสดุ
                    </label>
                    <p className="text-[14px] font-bold text-gray-800">
                      {new Date(
                        selectedLoan.expectedReturnDate,
                      ).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 py-6 bg-gray-50/50 flex flex-col sm:flex-row gap-3">
              {selectedLoan.status === "BORROWED" && (
                <button
                  onClick={() => handleReturnLoan(selectedLoan.id)}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-gray-900 text-white rounded-2xl text-[14px] font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-200"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Check size={20} />
                  )}
                  บันทึกการคืน
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[14px] font-bold hover:bg-gray-50 transition-all text-center"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    รายการยืมทั้งหมด: "bg-blue-600 text-white",
    กำลังยืม: "bg-amber-500 text-white",
    คืนสำเร็จแล้ว: "bg-emerald-600 text-white",
  };

  const colorClass = colorMap[label] || className || "bg-blue-600 text-white";

  return (
    <div
      className={`flex flex-col items-center justify-center p-5 min-w-0 w-full rounded-xl shadow-md ${colorClass}`}
    >
      <span className="text-sm font-bold mb-1">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
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
