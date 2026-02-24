"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/services/api";
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
} from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
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

// --- Sub-Components ---
const StatusBadge = ({ status }: { status: LoanStatus }) => {
  const configs = {
    BORROWED: {
      color: "bg-neutral-800 text-white border-neutral-800",
      label: "กำลังยืม",
      icon: Clock,
    },
    RETURNED: {
      color: "bg-black text-white border-black",
      label: "คืนแล้ว",
      icon: CheckCircle2,
    },
    OVERDUE: {
      color: "bg-neutral-800 text-white border-neutral-800 bg-",
      label: "กำลังยืม",
      icon: Clock,
    },
  };
  const { color, label, icon: Icon } = configs[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${color}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
};

export default function ITLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    description: "",
    quantity: 1,
    expectedReturnDate: "",
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
      // ดึงข้อมูลทั้งหมดของการยืมเหมือนแอดมิน
      const data = await apiFetch("/api/loans/admin/all");
      setLoans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch Error:", err);
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
    if (urlStatus) {
      setFilterStatus(urlStatus);
    }
  }, [urlStatus]);

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

  const handleReturnItem = async (id: number) => {
    if (!confirm("ยืนยันการรับคืนอุปกรณ์นี้?")) return;
    try {
      await apiFetch(`/api/loans/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "RETURNED",
          returnDate: new Date().toISOString(),
        }),
      });
      fetchLoans();
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const handleDeleteLoan = async (id: number) => {
    if (!confirm("ลบรายการยืมนี้?")) return;
    try {
      await apiFetch(`/api/loans/${id}`, { method: "DELETE" });
      fetchLoans();
    } catch (err) {
      alert("เกิดข้อผิดพลาด");
    }
  };

  const handleAddLoan = async () => {
    if (
      !formData.itemName ||
      !formData.expectedReturnDate ||
      !formData.borrowerName
    ) {
      alert("กรุณากรอกข้อมูลจำเป็น: ชื่ออุปกรณ์, วันกำหนดคืน, ชื่อผู้ยืม");
      return;
    }

    try {
      setSubmitting(true);
      await apiFetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: formData.itemName,
          description: formData.description,
          quantity: formData.quantity,
          expectedReturnDate: formData.expectedReturnDate,
          borrowerName: formData.borrowerName,
          borrowerDepartment: formData.borrowerDepartment,
          borrowerPhone: formData.borrowerPhone,
          borrowerLineId: formData.borrowerLineId,
        }),
      });

      alert("บันทึกการยืมสำเร็จ");
      setShowModal(false);
      setFormData({
        itemName: "",
        description: "",
        quantity: 1,
        expectedReturnDate: "",
        borrowerName: "",
        borrowerDepartment: "",
        borrowerPhone: "",
        borrowerLineId: "",
      });
      await fetchLoans();
    } catch (err) {
      console.error("Error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-black">
            ยืมอุปกรณ์
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-black hover:bg-gray-900 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-base font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={2} />
          เพิ่มรายการใหม่
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="รายการทั้งหมด"
          count={stats.total}
          colorClass="bg-blue-600 text-white"
        />
        <StatCard
          label="กำลังถูกยืม"
          count={stats.active}
          colorClass="bg-amber-500 text-white"
        />
        <StatCard
          label="คืนสำเร็จแล้ว"
          count={stats.returned}
          colorClass="bg-emerald-600 text-white"
        />
      </div>

      {/* Search & Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="ค้นหาชื่ออุปกรณ์, ชื่อพนักงาน หรือแผนก..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 outline-none transition-all text-black font-medium placeholder-gray-400 text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg font-medium text-black focus:outline-none focus:ring-2 focus:ring-gray-400/20 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="BORROWED">กำลังยืม</option>
            <option value="RETURNED">คืนแล้ว</option>
          </select>
          <button
            onClick={fetchLoans}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden divide-y divide-gray-100">
          {filteredLoans.map((loan) => (
            <div
              key={loan.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="max-w-[70%]">
                  <h3 className="font-bold text-black text-sm md:text-base truncate">
                    {loan.itemName}
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {loan.description || "ไม่มีรายละเอียด"}
                  </p>
                </div>
                <StatusBadge status={loan.status} />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <User size={12} className="text-gray-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] md:text-sm font-semibold text-gray-700 leading-tight">
                    {loan.borrowerName}
                  </span>
                  <span className="text-[9px] md:text-xs text-gray-400">
                    {loan.borrowerDepartment || "ไม่ระบุแผนก"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 bg-gray-50/80 px-3 py-2.5 rounded-xl border border-gray-100">
                <div className="text-[9px] md:text-xs text-gray-500 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Calendar size={10} className="text-gray-400" />
                    <span>
                      คืน: {safeFormat(loan.expectedReturnDate, "dd MMM yy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-gray-400" />
                    <span>ยืม: {safeFormat(loan.borrowDate, "dd/MM/yy")}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedLoan(loan);
                      setShowDetailModal(true);
                    }}
                    className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow-sm active:scale-95 transition-transform"
                  >
                    <FileText size={14} />
                  </button>
                  {loan.status !== "RETURNED" && (
                    <button
                      onClick={() => handleReturnItem(loan.id)}
                      className="p-2 bg-black text-white rounded-lg shadow-sm active:scale-95 transition-transform"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteLoan(loan.id)}
                    className="p-2 bg-white border border-red-100 text-red-600 rounded-lg shadow-sm active:scale-95 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredLoans.length === 0 && <EmptyState />}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-6 py-3 text-xs font-bold text-black uppercase border-b border-gray-100">
                  อุปกรณ์
                </th>
                <th className="px-6 py-3 text-xs font-bold text-black uppercase border-b border-gray-100">
                  ผู้รับผิดชอบ
                </th>
                <th className="px-6 py-3 text-xs font-bold text-black uppercase border-b border-gray-100">
                  กำหนดคืน
                </th>
                <th className="px-6 py-3 text-xs font-bold text-black uppercase border-b border-gray-100">
                  สถานะ
                </th>
                <th className="px-6 py-3 border-b border-gray-100"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLoans.map((loan) => (
                <tr
                  key={loan.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-black">
                      {loan.itemName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {loan.description || "ไม่มีรายละเอียด"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-black flex items-center gap-2">
                        <User size={14} className="text-gray-400" />{" "}
                        {loan.borrowerName}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-2 mt-1.5">
                        <Building2 size={12} className="text-gray-400" />{" "}
                        {loan.borrowerDepartment || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-black">
                      {safeFormat(loan.expectedReturnDate, "dd MMM yyyy")}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      ยืมเมื่อ: {safeFormat(loan.borrowDate, "dd/MM/yy")}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={loan.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowDetailModal(true);
                        }}
                        className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                        title="ดูรายละเอียด"
                      >
                        <FileText size={16} strokeWidth={2} />
                      </button>
                      {loan.status !== "RETURNED" && (
                        <button
                          onClick={() => handleReturnItem(loan.id)}
                          className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-black hover:text-white transition-all"
                          title="รับคืน"
                        >
                          <Check size={16} strokeWidth={2} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
                        className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLoans.length === 0 && <EmptyState />}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-black">
                  รายละเอียดการยืม
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  ID: {selectedLoan.id}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 md:p-6 overflow-y-auto max-h-[75vh]">
              <div className="space-y-5">
                {/* ข้อมูลอุปกรณ์ */}
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-sm font-semibold text-black mb-3">
                    อุปกรณ์
                  </h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          ชื่ออุปกรณ์
                        </p>
                        <p className="text-sm font-medium text-black">
                          {selectedLoan.itemName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">จำนวน</p>
                        <p className="text-sm font-medium text-black">
                          {selectedLoan.quantity} ชิ้น
                        </p>
                      </div>
                    </div>
                    {selectedLoan.description && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">รายละเอียด</p>
                        <p className="text-sm text-gray-700">
                          {selectedLoan.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ข้อมูลผู้ยืม */}
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-sm font-semibold text-black mb-3">
                    ผู้ยืม
                  </h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">ชื่อ</p>
                      <p className="font-medium text-black">
                        {selectedLoan.borrowerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">แผนก</p>
                      <p className="text-gray-700">
                        {selectedLoan.borrowerDepartment || "-"}
                      </p>
                    </div>
                    {selectedLoan.borrowerPhone && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">เบอร์โทร</p>
                        <p className="text-gray-700">
                          {selectedLoan.borrowerPhone}
                        </p>
                      </div>
                    )}
                    {selectedLoan.borrowerLineId && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Line ID</p>
                        <p className="text-gray-700">
                          @{selectedLoan.borrowerLineId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ข้อมูลวันที่ */}
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-sm font-semibold text-black mb-3">
                    วันที่
                  </h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">วันยืม</p>
                      <p className="font-medium text-black">
                        {safeFormat(selectedLoan.borrowDate, "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {safeFormat(selectedLoan.borrowDate, "HH:mm")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">วันคืนต้อง</p>
                      <p className="font-medium text-black">
                        {safeFormat(
                          selectedLoan.expectedReturnDate,
                          "dd MMM yyyy",
                        )}
                      </p>
                    </div>
                    {selectedLoan.returnDate && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">วันคืนจริง</p>
                        <p className="font-medium text-black">
                          {safeFormat(selectedLoan.returnDate, "dd MMM yyyy")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* สถานะ */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-2">สถานะ</p>
                    <StatusBadge status={selectedLoan.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">เลขที่</p>
                    <p className="text-lg font-semibold text-black">
                      #{selectedLoan.id}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
              {selectedLoan.status === "BORROWED" && (
                <button
                  onClick={() => {
                    handleReturnItem(selectedLoan.id);
                    setShowDetailModal(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-all font-medium text-sm"
                >
                  <Check size={16} />
                  บันทึกการคืน
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium text-sm"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-bold text-black">บันทึกการยืมใหม่</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-black p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Side: Item Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                    ข้อมูลอุปกรณ์
                  </h3>
                  <div className="space-y-4">
                    <FormInput
                      label="ชื่ออุปกรณ์"
                      required
                      value={formData.itemName}
                      onChange={(v) =>
                        setFormData({ ...formData, itemName: v })
                      }
                      placeholder="เช่น โน๊ตบุ๊ค"
                    />
                    <FormTextArea
                      label="รายละเอียด"
                      value={formData.description}
                      onChange={(v) =>
                        setFormData({ ...formData, description: v })
                      }
                      placeholder=""
                    />
                    <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4">
                    ข้อมูลผู้ยืม
                  </h3>
                  <div className="space-y-4">
                    <FormInput
                      label="ชื่อผู้ยืม"
                      required
                      value={formData.borrowerName}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerName: v })
                      }
                      placeholder=""
                    />
                    <FormInput
                      label="แผนก"
                      value={formData.borrowerDepartment}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerDepartment: v })
                      }
                      placeholder=""
                    />
                    <FormInput
                      label="เบอร์โทรศัพท์"
                      icon={<Phone size={14} />}
                      value={formData.borrowerPhone}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerPhone: v })
                      }
                      placeholder=""
                    />
                    <FormInput
                      label="Line ID"
                      value={formData.borrowerLineId}
                      onChange={(v) =>
                        setFormData({ ...formData, borrowerLineId: v })
                      }
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-white flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddLoan}
                disabled={submitting}
                className="flex-[2] py-3 bg-black text-white font-semibold rounded-lg shadow-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Check size={18} strokeWidth={2} />
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
  count,
  colorClass = "bg-blue-600 text-white",
}: {
  label: string;
  count: number;
  colorClass?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-5 min-w-0 w-full rounded-xl shadow-md transition-all hover:scale-[1.05] hover:shadow-xl ${colorClass}`}
    >
      <span className="text-sm mb-1 text-center whitespace-nowrap font-bold uppercase tracking-wider">
        {label}
      </span>
      <span className="text-4xl font-black">{count}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-black rounded-full animate-spin"></div>
      <p className="font-semibold text-black text-sm uppercase">
        Loading Records...
      </p>
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
