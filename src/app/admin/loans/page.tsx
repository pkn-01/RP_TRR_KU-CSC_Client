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
  FileText,
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
  const [showModal, setShowModal] = useState(false);
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

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

  const handleMarkAsReturned = async (loanId: number) => {
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

  const handleViewDetail = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
  };

  const handleAddLoan = async () => {
    if (!formData.itemName || !formData.borrowerName) {
      return;
    }

    try {
      setIsSaving(true);
      const today = new Date();

      await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          itemName: formData.itemName,
          description: formData.description || "",
          quantity: formData.quantity || 1,
          borrowDate: today.toISOString(),
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

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg overflow-hidden">
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
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">
                      {loan.itemName}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {loan.borrowerName || loan.borrowedBy?.name || "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {new Date(loan.borrowDate).toLocaleDateString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                    >
                      {statusConfig[loan.status]?.label || loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewDetail(loan)}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl "
                        title="ดูรายละเอียด"
                      >
                        <FileText size={20} />
                      </button>
                      <button
                        onClick={() => handleMarkAsReturned(loan.id)}
                        disabled={loan.status === "RETURNED"}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl "
                        title="คืนอุปกรณ์"
                      >
                        <Check size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl "
                        title="ลบ"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedLoans.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    ไม่พบรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {paginatedLoans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-900">
                  {loan.itemName}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig[loan.status]?.bg} ${statusConfig[loan.status]?.color}`}
                >
                  {statusConfig[loan.status]?.label || loan.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-1">
                ผู้ยืม: {loan.borrowerName || loan.borrowedBy?.name || "-"}
              </p>
              <p className="text-xs text-gray-500">
                วันที่ยืม:{" "}
                {new Date(loan.borrowDate).toLocaleDateString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleViewDetail(loan)}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-[#C700FF] text-white shadow-md"
                >
                  <FileText size={20} />
                </button>
                <button
                  onClick={() => handleMarkAsReturned(loan.id)}
                  disabled={loan.status === "RETURNED"}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 shadow-md disabled:opacity-50"
                >
                  <Check size={20} />
                </button>
                <button
                  onClick={() => handleDelete(loan.id)}
                  className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 shadow-md"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
          {paginatedLoans.length === 0 && (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              ไม่พบรายการ
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

      {/* Detail Modal */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-0 max-w-2xl w-full shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                รายละเอียดการยืม
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 p-2 rounded-full"
              >
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Item Info */}
              <div className="flex gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {selectedLoan.itemName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    จำนวน: {selectedLoan.quantity} รายการ
                  </p>
                  {selectedLoan.description && (
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      {selectedLoan.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                {/* Borrower Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    ข้อมูลผู้ยืม
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                      <span>
                        {selectedLoan.borrowerName ||
                          selectedLoan.borrowedBy?.name}
                      </span>
                    </div>
                    {(selectedLoan.department ||
                      selectedLoan.borrowedBy?.department) && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span>
                          {selectedLoan.department ||
                            selectedLoan.borrowedBy?.department}
                        </span>
                      </div>
                    )}
                    {(selectedLoan.phoneNumber ||
                      selectedLoan.borrowedBy?.phoneNumber) && (
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span>
                          {selectedLoan.phoneNumber ||
                            selectedLoan.borrowedBy?.phoneNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Info */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    ระยะเวลาการยืม
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">
                        วันที่ยืม
                      </p>
                      <p className="text-sm text-gray-700 font-medium">
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
                    {selectedLoan.returnDate && (
                      <div>
                        <p className="text-[10px] text-green-500 uppercase">
                          คืนเมื่อ
                        </p>
                        <p className="text-sm text-green-700 font-medium">
                          {new Date(selectedLoan.returnDate).toLocaleDateString(
                            "th-TH",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
              {selectedLoan.status !== "RETURNED" && (
                <button
                  onClick={() => {
                    handleMarkAsReturned(selectedLoan.id);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  ยืนยันการคืนอุปกรณ์
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <div className="bg-white/95 rounded-[2.5rem] p-0 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-[0_32px_64px_-15px_rgba(0,0,0,0.2)] border border-white/20">
            {/* Header */}
            <div className="flex justify-between items-center px-12 py-10">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                  บันทึกการยืมใหม่
                </h2>
                <p className="text-gray-400 text-sm mt-1 font-medium">
                  กรอกข้อมูลเพื่อสร้างรายการยืมอุปกรณ์ใหม่
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-900 transition-all bg-gray-50 hover:bg-gray-100 p-3 rounded-2xl border border-gray-100"
              >
                <XIcon size={24} strokeWidth={2.5} />
              </button>
            </div>

            <div className="px-12 pb-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left Column: Device Info Card */}
                <div className="bg-gray-50/40 p-10 rounded-[2rem] border border-gray-100/80 space-y-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-200/50">
                    <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                      <Package size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                      ข้อมูลอุปกรณ์
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
                        ชื่ออุปกรณ์ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.itemName}
                        onChange={(e) =>
                          setFormData({ ...formData, itemName: e.target.value })
                        }
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800 shadow-sm"
                        placeholder="ชื่ออุปกรณ์ที่ต้องการยืม"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
                        รายละเอียดเพิ่มเติม
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
                        className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800 shadow-sm resize-none"
                        placeholder="Serial No. หรือข้อมูลอื่นๆ"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
                        จำนวน
                      </label>
                      <div className="flex items-center gap-4">
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
                          className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all font-bold text-center text-gray-800 shadow-sm"
                        />
                        <div className="text-gray-400 font-bold text-sm px-4 whitespace-nowrap">
                          ชิ้น / เครื่อง
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Borrower Info Card */}
                <div className="bg-white p-10 rounded-[2rem] border border-gray-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.03)] space-y-8">
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
                      <User size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">
                      ข้อมูลผู้ยืม
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
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
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800"
                        placeholder="นามระบุชื่อ-นามสกุล"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
                        แผนก / ฝ่าย
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
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800"
                        placeholder="ระบุชื่อหน่วยงาน"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
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
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800"
                        placeholder="0xx-xxx-xxxx"
                      />
                    </div>

                    <div className="group">
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 group-focus-within:text-gray-700 transition-colors">
                        Line ID
                      </label>
                      <input
                        type="text"
                        value={formData.lineId}
                        onChange={(e) =>
                          setFormData({ ...formData, lineId: e.target.value })
                        }
                        className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-base focus:outline-none focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 transition-all placeholder:text-gray-300 font-semibold text-gray-800"
                        placeholder="@username"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-12 pt-10 border-t border-gray-100 flex gap-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-10 py-5 bg-white border-2 border-gray-100 text-gray-500 rounded-[1.5rem] text-lg font-extrabold hover:bg-gray-50 hover:text-gray-700 hover:border-gray-200 transition-all shadow-sm flex-1"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAddLoan}
                  disabled={
                    isSaving || !formData.itemName || !formData.borrowerName
                  }
                  className="px-12 py-5 bg-gray-900 text-white rounded-[1.5rem] text-lg font-extrabold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] flex items-center justify-center flex-[1.5]"
                >
                  {isSaving ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "ยืนยันการบันทึก"
                  )}
                </button>
              </div>
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
