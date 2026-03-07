"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  Calendar as CalendarIcon,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/services/api";
import { userService, User as UserType } from "@/services/userService";
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
  URGENT: "ด่วน",
  CRITICAL: "ด่วนที่สุด",
};

function RepairRecordsManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Date Range
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // Default to last month
    return d;
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

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

        const data = await apiFetch(`/api/repairs?${params.toString()}`);
        setRepairs((data as Repair[]) || []);
      } catch (err) {
        console.error("Error fetching repairs:", err);
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
    [startDate, endDate, filterStatus, filterUrgency],
  );

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  const filteredRepairs = useMemo(() => {
    return repairs.filter((item) => {
      const matchesSearch =
        item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.problemTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reporterName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [repairs, searchTerm]);

  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRepairs.slice(start, start + itemsPerPage);
  }, [filteredRepairs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);

  const handleExportExcel = async () => {
    if (filteredRepairs.length === 0) {
      Swal.fire({ icon: "info", title: "ไม่มีข้อมูลสำหรับส่งออก" });
      return;
    }

    try {
      Swal.fire({
        title: "กำลังเตรียมรายงาน...",
        text: "ระบบกำลังจัดรูปแบบไฟล์ Excel",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("รายการแจ้งซ่อม");

      // --- Styles ---
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

      // Header Row
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

      const titleRow = sheet.addRow(["รายงานสรุปรายการแจ้งซ่อม (Export)"]);
      titleRow.font = { size: 16, bold: true };
      sheet.mergeCells(1, 1, 1, 9);
      sheet.addRow([
        `ช่วงวันที่: ${startDate?.toLocaleDateString("th-TH")} - ${endDate?.toLocaleDateString("th-TH")}`,
      ]);
      sheet.addRow([`จำนวนทั้งหมด: ${filteredRepairs.length} รายการ`]);
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

      filteredRepairs.forEach((repair) => {
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
      const fileName = `RepairRecords_${new Date().toISOString().split("T")[0]}.xlsx`;
      saveAs(new Blob([buffer]), fileName);

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "ส่งออกข้อมูลสำเร็จ",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export error:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการส่งออก",
      });
    }
  };

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
        setLoading(true);
        await apiFetch(`/api/repairs/${id}`, { method: "DELETE" });
        Swal.fire({
          icon: "success",
          title: "ลบข้อมูลสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        fetchRepairs(false);
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถลบข้อมูลได้",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (!startDate || !endDate) return;

    const result = await Swal.fire({
      title: "ยืนยันการล้างข้อมูลแบบกลุ่ม?",
      html: `คุณกำลังจะลบข้อมูล <b>ทั้งหมด</b> ในช่วงวันที่<br/><span class="text-red-600 font-bold">${startDate.toLocaleDateString("th-TH")} - ${endDate.toLocaleDateString("th-TH")}</span><br/>การดำเนินการนี้ไม่สามารถย้อนกลับได้!`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ยืนยันลบทั้งหมด",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "กำลังลบข้อมูล...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        const params = new URLSearchParams();
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());

        const response: any = await apiFetch(
          `/api/repairs/bulk-delete/by-date?${params.toString()}`,
          {
            method: "DELETE",
          },
        );

        Swal.fire({
          icon: "success",
          title: "ล้างข้อมูลสำเร็จ",
          text: `ลบข้อมูลทั้งหมด ${response.count} รายการ`,
        });
        fetchRepairs(true);
      } catch (err) {
        console.error("Bulk delete error:", err);
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถล้างข้อมูลแบบกลุ่มได้",
        });
      }
    }
  };

  if (loading && repairs.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              จัดการข้อมูลรายการแจ้งซ่อม
            </h1>
            <p className="text-sm text-gray-500">
              ตรวจสอบและจัดการประวัติการแจ้งซ่อมทั้งหมด
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRepairs(false)}
              className={`p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all ${isRefreshing ? "animate-spin" : ""}`}
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-sm"
            >
              <Download size={18} />
              <span>ส่งออก Excel</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-medium hover:bg-red-100 transition-all shadow-sm"
              title="ล้างข้อมูลในช่วงวันที่ที่เลือก"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline">ล้างข้อมูลตามช่วงเวลา</span>
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1.5 font-sans">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                ค้นหา
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="รหัส, ปัญหา, ผู้แจ้ง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-sans"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-3 space-y-0">
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  ตั้งแต่วันที่
                </label>
                <CalendarPop
                  selectedDate={startDate}
                  onDateSelect={(d) => setStartDate(d)}
                />
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  ถึงวันที่
                </label>
                <CalendarPop
                  selectedDate={endDate}
                  onDateSelect={(d) => setEndDate(d)}
                  align="right"
                />
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  สถานะ
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">ทั้งหมด</option>
                  {Object.entries(statusLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                  ความเร่งด่วน
                </label>
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">ทั้งหมด</option>
                  {Object.entries(urgencyLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 font-sans">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    รหัส
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    วันที่แจ้ง
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    ปัญหา
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    สถานที่
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    ความเร่งด่วน
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                    สถานะ
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedRepairs.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 transition-colors group font-sans"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-medium text-gray-600">
                        {item.ticketCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.createdAt).toLocaleDateString("th-TH")}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(item.createdAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div
                        className="text-sm font-medium text-gray-900 truncate"
                        title={item.problemTitle}
                      >
                        {item.problemTitle}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.reporterName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          item.urgency === "CRITICAL"
                            ? "bg-red-50 text-red-600 border border-red-100"
                            : item.urgency === "URGENT"
                              ? "bg-orange-50 text-orange-600 border border-orange-100"
                              : "bg-gray-50 text-gray-600 border border-gray-100"
                        }`}
                      >
                        {urgencyLabels[item.urgency] || item.urgency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.status === "COMPLETED"
                            ? "bg-green-50 text-green-600 border border-green-100"
                            : item.status === "PENDING"
                              ? "bg-blue-50 text-blue-600 border border-blue-100"
                              : item.status === "CANCELLED"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-amber-50 text-amber-600 border border-amber-100"
                        }`}
                      >
                        {statusLabels[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() =>
                          router.push(`/admin/repairs/${item.ticketCode}`)
                        }
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ดูรายละเอียด/จัดการ"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.ticketCode)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="ลบรายการ"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedRepairs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Search size={48} className="stroke-[1]" />
                        <p>ไม่พบข้อมูลที่ตรงตามเงื่อนไข</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between font-sans">
              <p className="text-sm text-gray-500">
                แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง{" "}
                {Math.min(currentPage * itemsPerPage, filteredRepairs.length)}{" "}
                จาก {filteredRepairs.length} รายการ
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-50 transition-all font-sans"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-all font-sans ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100 text-gray-600"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-50 transition-all font-sans"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
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
