"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Download,
  Trash2,
  ExternalLink,
  CalendarDays,
  AlertTriangle,
  Loader2,
  Filter,
  ArrowRight,
  FileText,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { apiFetch } from "@/services/api";
import CalendarPop from "@/components/CalendarPop";
import Loading from "@/components/Loading";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

interface Repair {
  id: string;
  ticketCode: string;
  problemTitle: string;
  problemDescription?: string;
  location: string;
  reporterName: string;
  reporterDepartment?: string;
  reporterPhone?: string;
  status: string;
  urgency: string;
  createdAt: string;
  assignees: {
    user: {
      id: number;
      name: string;
    };
  }[];
}

const statusLabels: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
  ASSIGNED: "มอบหมายแล้ว",
  WAITING_PARTS: "รออะไหล่",
};

const urgencyLabels: Record<string, string> = {
  NORMAL: "ปกติ",
  URGENT: "ด่าน",
  CRITICAL: "ด่วนที่สุด",
};

function RepairRecordsManagementContent() {
  const router = useRouter();

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Date Range
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  const fetchRepairs = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        else setIsRefreshing(true);

        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate.toISOString());
        if (endDate) params.append("endDate", endDate.toISOString());
        if (filterStatus !== "all") params.append("status", filterStatus);
        if (filterUrgency !== "all") params.append("urgency", filterUrgency);
        if (searchTerm.trim()) params.append("search", searchTerm.trim());

        const data = await apiFetch(`/api/repairs?${params.toString()}`);
        setRepairs((data as Repair[]) || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Fetch error:", err);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถโหลดข้อมูลรายการแจ้งซ่อมได้",
        });
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [startDate, endDate, filterStatus, filterUrgency, searchTerm],
  );

  // Debounced search/filter effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepairs(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus, filterUrgency, startDate, endDate]);

  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return repairs.slice(start, start + itemsPerPage);
  }, [repairs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(repairs.length / itemsPerPage);

  // ===== ACTION HANDLERS =====

  const handleDelete = async (id: string, ticketCode: string) => {
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบรายการแจ้งซ่อมรหัส ${ticketCode} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ใช่, ลบเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        await apiFetch(`/api/repairs/${id}`, { method: "DELETE" });
        Swal.fire({
          icon: "success",
          title: "ลบข้อมูลสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchRepairs(false);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถลบข้อมูลได้",
        });
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!startDate || !endDate) return;

    const result = await Swal.fire({
      title: "⚠️ ยืนยันการล้างข้อมูล",
      html: `<div style="text-align:left; font-size:14px; line-height:1.8;">
        <p>คุณกำลังจะ <b style="color:#dc2626;">ลบข้อมูลทั้งหมด</b> ในช่วงวันที่:</p>
        <p style="background:#fef2f2; padding:8px 12px; border-radius:8px; margin:8px 0; text-align:center; font-weight:bold; color:#dc2626;">
          ${startDate.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          &nbsp;—&nbsp;
          ${endDate.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p style="color:#6b7280; font-size:13px;">พบข้อมูล <b>${repairs.length}</b> รายการในช่วงที่เลือก</p>
        <p style="color:#dc2626; font-size:13px; margin-top:4px;">การดำเนินการนี้ไม่สามารถย้อนกลับได้!</p>
      </div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยัน ลบทั้งหมด",
      cancelButtonText: "ยกเลิก",
      input: "text",
      inputPlaceholder: 'พิมพ์ "ยืนยัน" เพื่อดำเนินการ',
      inputValidator: (value) => {
        if (value !== "ยืนยัน") {
          return 'กรุณาพิมพ์ "ยืนยัน"';
        }
      },
    });

    if (result.isConfirmed) {
      try {
        setIsDeleting(true);
        Swal.fire({
          title: "กำลังลบข้อมูล...",
          text: "กรุณารอสักครู่",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const params = new URLSearchParams();
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());

        const response: any = await apiFetch(
          `/api/repairs/bulk-delete/by-date?${params.toString()}`,
          { method: "DELETE" },
        );

        Swal.fire({
          icon: "success",
          title: "ล้างข้อมูลสำเร็จ",
          text: `ลบข้อมูลทั้งหมด ${response.count} รายการ`,
        });
        fetchRepairs(true);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถล้างข้อมูลแบบกลุ่มได้",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleExportExcel = async () => {
    if (repairs.length === 0) {
      Swal.fire({ icon: "info", title: "ไม่มีข้อมูลสำหรับส่งออก" });
      return;
    }

    try {
      Swal.fire({
        title: "กำลังเตรียมรายงาน...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("รายการแจ้งซ่อม");

      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      const whiteText: Partial<ExcelJS.Font> = {
        color: { argb: "FFFFFFFF" },
        bold: true,
      };
      const borderStyle: Partial<ExcelJS.Borders> = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };

      const headers = [
        "รหัส",
        "วันที่แจ้ง",
        "ปัญหา",
        "สถานที่",
        "ผู้แจ้ง",
        "แผนก",
        "ความเร่งด่วน",
        "สถานะ",
        "ช่างผู้รับผิดชอบ",
      ];

      const titleRow = sheet.addRow(["รายงานสรุปรายการแจ้งซ่อม"]);
      titleRow.font = { size: 16, bold: true };
      sheet.mergeCells(1, 1, 1, 9);
      sheet.addRow([
        `ช่วงวันที่: ${startDate?.toLocaleDateString("th-TH")} - ${endDate?.toLocaleDateString("th-TH")}`,
      ]);
      sheet.addRow([`จำนวนทั้งหมด: ${repairs.length} รายการ`]);
      sheet.addRow([]);

      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = whiteText;
        cell.border = borderStyle;
        cell.alignment = { horizontal: "center" };
      });

      sheet.columns = [
        { key: "code", width: 18 },
        { key: "date", width: 20 },
        { key: "title", width: 35 },
        { key: "loc", width: 25 },
        { key: "reporter", width: 25 },
        { key: "dept", width: 20 },
        { key: "urgency", width: 15 },
        { key: "status", width: 15 },
        { key: "assignees", width: 30 },
      ];

      repairs.forEach((repair) => {
        const row = sheet.addRow([
          repair.ticketCode,
          new Date(repair.createdAt).toLocaleString("th-TH"),
          repair.problemTitle,
          repair.location,
          repair.reporterName,
          repair.reporterDepartment || "-",
          urgencyLabels[repair.urgency] || repair.urgency,
          statusLabels[repair.status] || repair.status,
          repair.assignees?.map((a) => a.user.name).join(", ") || "-",
        ]);
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer]),
        `RepairRecords_${new Date().toISOString().split("T")[0]}.xlsx`,
      );

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "ส่งออกข้อมูลสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการส่งออก" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              จัดการข้อมูลรายการแจ้งซ่อม
            </h1>
            <p className="text-slate-500 font-medium">
              ตรวจสอบ กรองข้อมูล และล้างข้อมูลตามช่วงเวลาที่ต้องการ
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRepairs(true)}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-semibold hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
            >
              <RefreshCw
                size={18}
                className={
                  isRefreshing || loading
                    ? "animate-spin"
                    : "group-hover:rotate-180 transition-transform duration-500"
                }
              />
              <span>รีเฟรช</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={repairs.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-semibold hover:bg-slate-800 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <Download size={18} />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Filter Bar */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Search */}
                <div className="md:col-span-6 relative group">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="รหัสตั๋ว, ปัญหา, ผู้แจ้ง, สถานที่..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>

                {/* Status Filter */}
                <div className="md:col-span-3 relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-slate-700"
                  >
                    <option value="all">ทุกสถานะ</option>
                    {Object.entries(statusLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <Filter
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                </div>

                {/* Urgency Filter */}
                <div className="md:col-span-3 relative">
                  <select
                    value={filterUrgency}
                    onChange={(e) => setFilterUrgency(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm appearance-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-semibold text-slate-700"
                  >
                    <option value="all">ทุกระดับ</option>
                    {Object.entries(urgencyLabels).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <AlertTriangle
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={16}
                  />
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[500px] flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                        ตั๋ว / วันที่
                      </th>
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                        ปัญหา / ผู้แจ้ง
                      </th>
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                        สถานที่
                      </th>
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-center">
                        สถานะ
                      </th>
                      <th className="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-[0.1em] text-right">
                        การจัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="text-slate-400 font-medium animate-pulse">
                              กำลังดึงข้อมูล...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedRepairs.length > 0 ? (
                      paginatedRepairs.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-700 font-mono tracking-tight">
                                {item.ticketCode}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                                <Clock size={12} />
                                {new Date(item.createdAt).toLocaleDateString(
                                  "th-TH",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "2-digit",
                                  },
                                )}
                                <span>
                                  {new Date(item.createdAt).toLocaleTimeString(
                                    "th-TH",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 min-w-[200px]">
                            <div className="flex flex-col">
                              <span
                                className="text-sm font-bold text-slate-800 line-clamp-1"
                                title={item.problemTitle}
                              >
                                {item.problemTitle}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                                <User size={12} className="text-slate-400" />
                                {item.reporterName}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                              <MapPin size={14} className="text-slate-300" />
                              {item.location}
                            </div>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-center">
                            <span
                              className={`inline-flex px-3 py-1 rounded-xl text-[11px] font-extrabold shadow-sm border ${
                                item.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : item.status === "PENDING"
                                    ? "bg-sky-50 text-sky-600 border-sky-100"
                                    : item.status === "CANCELLED"
                                      ? "bg-rose-50 text-rose-600 border-rose-100"
                                      : "bg-amber-50 text-amber-600 border-amber-100"
                              }`}
                            >
                              {statusLabels[item.status] || item.status}
                            </span>
                          </td>
                          <td className="px-6 py-5 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/repairs/${item.ticketCode}`,
                                  )
                                }
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="ดูรายละเอียด"
                              >
                                <ExternalLink size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(item.id, item.ticketCode)
                                }
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="ลบรายการ"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-300">
                            <div className="p-6 bg-slate-50 rounded-full">
                              <FileText size={48} className="stroke-[1.5]" />
                            </div>
                            <div>
                              <p className="text-slate-500 font-bold text-lg">
                                ไม่พบข้อมูลที่ต้องการ
                              </p>
                              <p className="text-sm">
                                ลองเปลี่ยนเงื่อนไขการค้นหาหรือช่วงวันที่เลือก
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    หน้า {currentPage} จาก {totalPages} ({repairs.length}{" "}
                    รายการ)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-200 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let p =
                        totalPages <= 5
                          ? i + 1
                          : currentPage <= 3
                            ? i + 1
                            : currentPage >= totalPages - 2
                              ? totalPages - 4 + i
                              : currentPage - 2 + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm border ${
                            currentPage === p
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-blue-200 hover:text-blue-600"
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-200 hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
            {/* Control Center */}
            <div className="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="bg-blue-600 p-8 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CalendarDays size={24} />
                    ระบุช่วงเวลา
                  </h3>
                  <p className="text-blue-50/70 text-sm mt-1 font-medium">
                    จัดการมวลหมู่ข้อมูลย้อนหลัง
                  </p>
                </div>
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="absolute -left-12 bottom-0 w-24 h-24 bg-blue-400/20 rounded-full blur-xl" />
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      ตั้งแต่วันที่
                    </label>
                    <CalendarPop
                      selectedDate={startDate}
                      onDateSelect={setStartDate}
                    />
                  </div>
                  <div className="flex justify-center -my-2">
                    <div className="bg-slate-100 p-2 rounded-full border-4 border-white shadow-sm relative z-10">
                      <ArrowRight
                        size={14}
                        className="text-slate-400 rotate-90"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      จนถึงวันที่
                    </label>
                    <CalendarPop
                      selectedDate={endDate}
                      onDateSelect={setEndDate}
                    />
                  </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    สรุปข้อมูลที่พบ
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 leading-none">
                      {repairs.length}
                    </span>
                    <span className="text-sm font-bold text-slate-500">
                      รายการ
                    </span>
                  </div>
                </div>

                {/* Bulk Delete Zone */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
                    <AlertTriangle
                      className="text-rose-500 shrink-0 mt-0.5"
                      size={18}
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-rose-900">
                        พื้นที่เสี่ยง (Danger Zone)
                      </p>
                      <p className="text-[11px] text-rose-700/80 leading-relaxed font-medium">
                        ข้อมูลในช่วงที่เลือกจะถูกลบออกถาวรทั้งหมด
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleBulkDelete}
                    disabled={
                      repairs.length === 0 ||
                      isDeleting ||
                      !startDate ||
                      !endDate
                    }
                    className="w-full py-4 bg-rose-600 text-white rounded-[20px] font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />{" "}
                        กำลังดำเนินการ...
                      </>
                    ) : (
                      <>
                        <Trash2 size={20} /> ล้างข้อมูล {repairs.length} รายการ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Hint Box */}
            <div className="p-6 bg-amber-50 rounded-[28px] border border-amber-100">
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                💡 <strong>Tips:</strong> คุณสามารถค้นหาโดยใช้{" "}
                <strong>รหัสตั๋ว</strong> เพื่อจัดการรายการรายบุคคล
                หรือใช้การกรอง <strong>ช่วงวันที่</strong>{" "}
                เพื่อลบข้อมูลประวัติเก่าๆ ได้อย่างรวดเร็ว
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepairRecordsManagementPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RepairRecordsManagementContent />
    </Suspense>
  );
}
