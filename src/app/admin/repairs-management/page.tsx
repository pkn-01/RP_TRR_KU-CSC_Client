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
  URGENT: "ด่วน",
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
        setCurrentPage(1);
      } catch (err) {
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
      const term = searchTerm.toLowerCase();
      return (
        item.ticketCode.toLowerCase().includes(term) ||
        item.problemTitle?.toLowerCase().includes(term) ||
        item.reporterName?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term)
      );
    });
  }, [repairs, searchTerm]);

  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRepairs.slice(start, start + itemsPerPage);
  }, [filteredRepairs, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);

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
        <p>คุณกำลังจะ <b style="color:#dc2626;">ลบข้อมูลทั้งหมด</b> ในช่วง:</p>
        <p style="background:#fef2f2; padding:8px 12px; border-radius:8px; margin:8px 0; text-align:center; font-weight:bold; color:#dc2626;">
          ${startDate.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          &nbsp;—&nbsp;
          ${endDate.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p style="color:#6b7280; font-size:13px;">พบข้อมูล <b>${filteredRepairs.length}</b> รายการในช่วงนี้</p>
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
    if (filteredRepairs.length === 0) {
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

  if (loading && repairs.length === 0) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 sm:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            จัดการข้อมูลรายการแจ้งซ่อม
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            เลือกช่วงวันที่เพื่อดู, ส่งออก หรือลบข้อมูลรายการแจ้งซ่อม
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ===== LEFT: Data Table ===== */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filters Row */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="ค้นหา รหัส, ปัญหา, ผู้แจ้ง..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                {/* Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">สถานะ: ทั้งหมด</option>
                  {Object.entries(statusLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                {/* Priority */}
                <select
                  value={filterUrgency}
                  onChange={(e) => setFilterUrgency(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">ความเร่งด่วน: ทั้งหมด</option>
                  {Object.entries(urgencyLabels).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        รหัส
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        วันที่แจ้ง
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        ปัญหา
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                        สถานที่
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">
                        สถานะ
                      </th>
                      <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">
                        จัดการ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRepairs.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm font-mono font-medium text-gray-600">
                            {item.ticketCode}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(item.createdAt).toLocaleDateString(
                              "th-TH",
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleTimeString(
                              "th-TH",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {item.location}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                router.push(`/admin/repairs/${item.ticketCode}`)
                              }
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="ดูรายละเอียด"
                            >
                              <ExternalLink size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(item.id, item.ticketCode)
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="ลบรายการนี้"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {paginatedRepairs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <Search size={40} className="stroke-[1]" />
                            <p className="text-sm">
                              ไม่พบข้อมูลที่ตรงตามเงื่อนไข
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    แสดง {(currentPage - 1) * itemsPerPage + 1}–
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredRepairs.length,
                    )}{" "}
                    จาก {filteredRepairs.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                      className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-40 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                      className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-40 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT: Action Sidebar ===== */}
          <div className="space-y-4">
            {/* Date Range Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                เลือกช่วงวันที่
              </h3>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-0.5">
                    ตั้งแต่วันที่
                  </label>
                  <CalendarPop
                    selectedDate={startDate}
                    onDateSelect={(d) => setStartDate(d)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 ml-0.5">
                    ถึงวันที่
                  </label>
                  <CalendarPop
                    selectedDate={endDate}
                    onDateSelect={(d) => setEndDate(d)}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">พบข้อมูล</span>
                  <span className="font-bold text-gray-900 text-lg">
                    {filteredRepairs.length}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      รายการ
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2.5">
                {/* Bulk Delete — Prominent Danger Zone */}
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <button
                    onClick={handleBulkDelete}
                    disabled={
                      filteredRepairs.length === 0 ||
                      isDeleting ||
                      !startDate ||
                      !endDate
                    }
                    className="w-full py-2.5 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 focus:ring-4 focus:ring-red-100 transition-all shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        กำลังลบข้อมูล...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        ล้างข้อมูลตามช่วงเวลา ({filteredRepairs.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
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
