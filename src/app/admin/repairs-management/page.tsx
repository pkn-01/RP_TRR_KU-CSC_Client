// ===== จัดการข้อมูลรายการแจ้งซ่อม =====
"use client";

import {
  useState,
  useEffect,
  Suspense,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Download,
  Search,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CalendarDays,
  X,
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
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState<Date | null>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [deleteEndDate, setDeleteEndDate] = useState<Date | null>(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(15);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUrgency, setFilterUrgency] = useState("all");

  // Date Filtering (tabs style like repairs page)
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset pagination and selection when search term changes
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, filterStatus, filterUrgency, filter, selectedDate]);

  const fetchRepairs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setIsRefreshing(true);

      const data = await apiFetch("/api/repairs");
      setRepairs((data as Repair[]) || []);
      setLastUpdated(new Date());
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
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  // Auto-refresh logic
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (autoRefreshEnabled) {
      setCountdown(15);
      refreshTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (countdown === 0 && autoRefreshEnabled) {
      fetchRepairs(false).then(() => {
        setCountdown(15);
      });
    }
  }, [countdown, autoRefreshEnabled, fetchRepairs]);

  // Date range helpers
  const getDateRangeInfo = () => {
    const target = new Date(selectedDate);
    const formatThai = (d: Date) =>
      d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    if (filter === "day" || filter === "all") {
      return {
        periodLabel: filter === "all" ? "ทั้งหมด" : "รายวัน",
        rangeText: formatThai(target),
      };
    } else if (filter === "week") {
      const day = target.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = new Date(target);
      start.setDate(target.getDate() + diffToMonday);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        periodLabel: "รายสัปดาห์",
        rangeText: formatThai(start) + " ถึง " + formatThai(end),
      };
    } else {
      const firstDay = new Date(target.getFullYear(), target.getMonth(), 1);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0);
      return {
        periodLabel: "รายเดือน",
        rangeText: formatThai(firstDay) + " ถึง " + formatThai(lastDay),
      };
    }
  };

  // Filtering
  const filteredRepairs = useMemo(() => {
    return repairs.filter((item) => {
      // Text search
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        item.ticketCode.toLowerCase().includes(term) ||
        item.problemTitle?.toLowerCase().includes(term) ||
        item.reporterName?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term);

      // Status
      const matchesStatus =
        filterStatus === "all" || item.status === filterStatus;

      // Urgency
      const matchesUrgency =
        filterUrgency === "all" || item.urgency === filterUrgency;

      // Date
      let matchesDate = true;
      if (filter !== "all") {
        const createdAt = new Date(item.createdAt);
        const targetDate = new Date(selectedDate);

        if (filter === "day") {
          matchesDate = createdAt.toDateString() === targetDate.toDateString();
        } else if (filter === "week") {
          const day = targetDate.getDay();
          const diffToMonday = day === 0 ? -6 : 1 - day;
          const start = new Date(targetDate);
          start.setDate(targetDate.getDate() + diffToMonday);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setDate(start.getDate() + 6);
          end.setHours(23, 59, 59, 999);
          matchesDate = createdAt >= start && createdAt <= end;
        } else if (filter === "month") {
          matchesDate =
            createdAt.getMonth() === targetDate.getMonth() &&
            createdAt.getFullYear() === targetDate.getFullYear();
        }
      }

      return matchesSearch && matchesStatus && matchesUrgency && matchesDate;
    });
  }, [repairs, searchTerm, filterStatus, filterUrgency, filter, selectedDate]);

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);
  const paginatedRepairs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRepairs.slice(start, start + itemsPerPage);
  }, [filteredRepairs, currentPage, itemsPerPage]);

  const calendarDate = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

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

  // Count repairs in the delete date range
  const deleteRangeCount = useMemo(() => {
    if (!deleteStartDate || !deleteEndDate) return 0;
    const start = new Date(deleteStartDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(deleteEndDate);
    end.setHours(23, 59, 59, 999);
    return repairs.filter((r) => {
      const d = new Date(r.createdAt);
      return d >= start && d <= end;
    }).length;
  }, [repairs, deleteStartDate, deleteEndDate]);

  const handleBulkDelete = async () => {
    if (!deleteStartDate || !deleteEndDate) return;
    if (deleteRangeCount === 0) {
      Swal.fire({ icon: "info", title: "ไม่พบข้อมูลในช่วงที่เลือก" });
      return;
    }

    const startDate = new Date(deleteStartDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(deleteEndDate);
    endDate.setHours(23, 59, 59, 999);

    const formatThai = (d: Date) =>
      d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    const result = await Swal.fire({
      title: "⚠️ ยืนยันการล้างข้อมูล",
      html: `<div style="text-align:left; font-size:14px; line-height:1.8;">
        <p>คุณกำลังจะ <b style="color:#dc2626;">ลบข้อมูลทั้งหมด</b> ในช่วง:</p>
        <p style="background:#fef2f2; padding:8px 12px; border-radius:8px; margin:8px 0; text-align:center; font-weight:bold; color:#dc2626;">
          ${formatThai(startDate)}&nbsp;—&nbsp;${formatThai(endDate)}
        </p>
        <p style="color:#6b7280; font-size:13px;">พบข้อมูล <b>${deleteRangeCount}</b> รายการในช่วงนี้</p>
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
        setShowDeletePanel(false);
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (
      selectedIds.size === paginatedRepairs.length &&
      paginatedRepairs.length > 0
    ) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRepairs.map((r) => r.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const result = await Swal.fire({
      title: "ยืนยันการลบรายการที่เลือก?",
      text: `คุณกำลังจะลบรายการแจ้งซ่อมจำนวน ${selectedIds.size} รายการ ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ใช่, ลบเลย",
      cancelButtonText: "ยกเลิก",
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: "กำลังลบข้อมูล...",
          text: "กรุณารอสักครู่",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        await apiFetch("/api/repairs/bulk-delete/by-ids", {
          method: "DELETE",
          body: JSON.stringify({
            ids: Array.from(selectedIds).map((id) => Number(id)),
          }),
        });

        Swal.fire({
          icon: "success",
          title: "ลบข้อมูลสำเร็จ",
          timer: 1500,
          showConfirmButton: false,
        });
        setSelectedIds(new Set());
        fetchRepairs(false);
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถลบข้อมูลแบบกลุ่มได้",
        });
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
        text: "ระบบกำลังจัดรูปแบบไฟล์ Excel",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const { periodLabel, rangeText } = getDateRangeInfo();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("รายการแจ้งซ่อม");

      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      const subHeaderFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
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

      // Title & Meta
      const titleRow = sheet.addRow(["รายงานสรุปรายการแจ้งซ่อม"]);
      titleRow.font = { size: 16, bold: true, color: { argb: "FF1E3A8A" } };
      sheet.mergeCells(1, 1, 1, 9);
      sheet.addRow([]);

      const addMetaRow = (label: string, value: any) => {
        const row = sheet.addRow([label, value]);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = subHeaderFill;
      };

      addMetaRow("ประเภทรายงาน", periodLabel);
      addMetaRow("ช่วงเวลาของข้อมูล", rangeText);
      addMetaRow("วันที่ส่งออก", new Date().toLocaleString("th-TH"));
      addMetaRow("จำนวนทั้งหมด", filteredRepairs.length + " รายการ");
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

      filteredRepairs.forEach((repair, index) => {
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

        if (index % 2 === 1) {
          row.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF9FAFB" },
            };
          });
        }

        row.eachCell((cell) => {
          cell.border = borderStyle;
        });

        // Urgency Color
        const uCell = row.getCell(7);
        if (repair.urgency === "CRITICAL")
          uCell.font = { color: { argb: "FFEF4444" }, bold: true };
        else if (repair.urgency === "URGENT")
          uCell.font = { color: { argb: "FFF59E0B" }, bold: true };

        // Status Color
        const sCell = row.getCell(8);
        if (repair.status === "COMPLETED")
          sCell.font = { color: { argb: "FF10B981" }, bold: true };
        else if (repair.status === "IN_PROGRESS")
          sCell.font = { color: { argb: "FFF59E0B" }, bold: true };
        else if (repair.status === "CANCELLED")
          sCell.font = { color: { argb: "FFEF4444" }, bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const dateSuffix = new Date().toISOString().split("T")[0];
      saveAs(
        new Blob([buffer]),
        `RepairRecords_${periodLabel}_${dateSuffix}.xlsx`,
      );

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "ส่งออกข้อมูลสำเร็จ",
        text: "ไฟล์รายงานถูกสร้างและจัดรูปแบบเรียบร้อยแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาดในการส่งออก" });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Filters Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
          {/* Row 1: Search + Real-time + Actions */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-full sm:max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="ค้นหา รหัส, ปัญหา, ผู้แจ้ง, สถานที่..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Real-time Status Pill */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoRefreshEnabled ? "bg-green-400" : "bg-gray-400"}`}
                    ></span>
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${autoRefreshEnabled ? "bg-green-500" : "bg-gray-500"}`}
                    ></span>
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-green-700">
                    {autoRefreshEnabled ? "เรียลไทม์" : "หยุด"}
                  </span>
                  <span className="text-green-300">|</span>
                  <span className="text-[10px] sm:text-xs text-green-600">
                    {countdown}s
                  </span>
                  <span className="hidden sm:inline text-green-300">|</span>
                  <Clock
                    size={12}
                    className="hidden sm:inline text-green-500"
                  />
                  <span className="hidden sm:inline text-xs text-green-600">
                    {lastUpdated.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                    className={`p-1.5 rounded-lg border transition-colors ${autoRefreshEnabled ? "text-orange-500 border-orange-200 hover:bg-orange-50" : "text-green-500 border-green-200 hover:bg-green-50"}`}
                    title={
                      autoRefreshEnabled
                        ? "หยุดรีเฟรชอัตโนมัติ"
                        : "เปิดรีเฟรชอัตโนมัติ"
                    }
                  >
                    {autoRefreshEnabled ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      fetchRepairs(false);
                      setCountdown(15);
                    }}
                    className={`p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors ${isRefreshing ? "animate-spin" : ""}`}
                    title="รีเฟรชข้อมูล"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-2 transition-all shadow-sm"
                >
                  <Trash2 size={16} />
                  <span>ลบที่เลือก ({selectedIds.size})</span>
                </button>
              )}
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 font-medium flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Download size={16} className="text-gray-500" />
                <span>Export</span>
              </button>
              <button
                onClick={() => setShowDeletePanel(!showDeletePanel)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap transition-colors ${
                  showDeletePanel
                    ? "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {showDeletePanel ? (
                  <>
                    <X size={16} />
                    ปิด
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    ล้างข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Delete Panel */}
          {showDeletePanel && (
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3 animate-in">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={16} />
                <span className="text-sm font-semibold">
                  เลือกช่วงเวลาที่ต้องการลบข้อมูล
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    ตั้งแต่วันที่
                  </label>
                  <CalendarPop
                    selectedDate={deleteStartDate}
                    onDateSelect={(d) => setDeleteStartDate(d)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    ถึงวันที่
                  </label>
                  <CalendarPop
                    selectedDate={deleteEndDate}
                    onDateSelect={(d) => setDeleteEndDate(d)}
                  />
                </div>
                <div className="flex items-center gap-3 sm:ml-4">
                  <div className="bg-white border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-gray-500">พบข้อมูล</span>
                    <span className="ml-1 text-lg font-bold text-red-600">
                      {deleteRangeCount}
                    </span>
                    <span className="ml-1 text-xs text-gray-500">รายการ</span>
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    disabled={
                      deleteRangeCount === 0 ||
                      isDeleting ||
                      !deleteStartDate ||
                      !deleteEndDate
                    }
                    className="px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 font-medium flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        กำลังลบ...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        ลบข้อมูลทั้งหมด
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Row 2: Date Tabs + Status/Priority Dropdowns */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
            {/* Date Filtering Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex bg-gray-100 rounded-lg p-1 h-9 overflow-x-auto max-w-full">
                {(["all", "day", "week", "month"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                      filter === f
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "all"
                      ? "ทั้งหมด"
                      : f === "day"
                        ? "รายวัน"
                        : f === "week"
                          ? "รายสัปดาห์"
                          : "รายเดือน"}
                  </button>
                ))}
              </div>

              {filter !== "all" && (
                <CalendarPop
                  selectedDate={calendarDate}
                  onDateSelect={(date: Date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const day = String(date.getDate()).padStart(2, "0");
                    setSelectedDate(`${year}-${month}-${day}`);
                  }}
                />
              )}
            </div>

            {/* Spacer */}
            <div className="hidden lg:block flex-1" />

            <div className="grid grid-cols-2 gap-2 flex-1 sm:flex-initial">
              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="all">ทุกสถานะ</option>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={filterUrgency}
                onChange={(e) => {
                  setFilterUrgency(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              >
                <option value="all">ทุกความเร่งด่วน</option>
                {Object.entries(urgencyLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                <th className="px-4 py-4 w-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedRepairs.length > 0 &&
                        selectedIds.size === paginatedRepairs.length
                      }
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  รหัส
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  เวลา
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  ปัญหา
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  สถานที่
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  ความเร่งด่วน
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
              {paginatedRepairs.map((repair) => (
                <tr
                  key={repair.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    router.push(`/admin/repairs/${repair.ticketCode}`)
                  }
                >
                  <td
                    className="px-4 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(repair.id)}
                        onChange={() => handleToggleSelect(repair.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-gray-900">
                      {repair.ticketCode}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {new Date(repair.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}{" "}
                      {new Date(repair.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[250px]">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {repair.problemTitle}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {repair.reporterName}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">
                      {repair.location}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        repair.urgency === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : repair.urgency === "URGENT"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {urgencyLabels[repair.urgency] || repair.urgency}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        repair.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : repair.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-700"
                            : repair.status === "PENDING"
                              ? "bg-sky-100 text-sky-700"
                              : repair.status === "ASSIGNED"
                                ? "bg-blue-100 text-blue-700"
                                : repair.status === "WAITING_PARTS"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {statusLabels[repair.status] || repair.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          router.push(`/admin/repairs/${repair.ticketCode}`)
                        }
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ดูรายละเอียด"
                      >
                        <ExternalLink size={16} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(repair.id, repair.ticketCode)
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
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search size={40} className="stroke-[1] text-gray-300" />
                      <p className="text-sm">ไม่พบรายการที่ตรงตามเงื่อนไข</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {paginatedRepairs.map((repair) => (
            <div
              key={repair.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
              onClick={() => router.push(`/admin/repairs/${repair.ticketCode}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(repair.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(repair.id);
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mb-1"
                    />
                    <span className="text-xs font-mono text-gray-500">
                      {repair.ticketCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        repair.urgency === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : repair.urgency === "URGENT"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {urgencyLabels[repair.urgency] || repair.urgency}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        repair.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : repair.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-700"
                            : repair.status === "PENDING"
                              ? "bg-sky-100 text-sky-700"
                              : repair.status === "ASSIGNED"
                                ? "bg-blue-100 text-blue-700"
                                : repair.status === "WAITING_PARTS"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {statusLabels[repair.status] || repair.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(repair.id, repair.ticketCode);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="ลบ"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
                {repair.problemTitle}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{repair.location}</span>
                <span>•</span>
                <span>{repair.reporterName}</span>
              </div>
            </div>
          ))}
          {paginatedRepairs.length === 0 && (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              <div className="flex flex-col items-center gap-2">
                <Search size={40} className="stroke-[1] text-gray-300" />
                <p className="text-sm">ไม่พบรายการที่ตรงตามเงื่อนไข</p>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredRepairs.length > 0 && (
          <div className="flex items-center justify-end gap-6 text-sm text-gray-700">
            {/* Rows per page selector */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Rows per page:</span>
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-transparent pl-2 pr-6 py-1 cursor-pointer outline-none hover:bg-gray-50 rounded"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Display range */}
            <div className="font-medium text-slate-700">
              {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, filteredRepairs.length)} of{" "}
              {filteredRepairs.length}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                title="หน้าก่อน"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 text-gray-800 hover:text-black disabled:opacity-30 disabled:hover:text-gray-800 transition-colors"
                title="หน้าถัดไป"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
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
