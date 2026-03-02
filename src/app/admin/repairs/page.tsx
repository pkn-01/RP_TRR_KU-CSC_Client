"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Download,
} from "lucide-react";
import { apiFetch } from "@/services/api";
import { userService, User as UserType } from "@/services/userService";
import CalendarPop from "../../../components/CalendarPop";
import Loading from "@/components/Loading";
import * as XLSX from "xlsx";
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
};

function AdminRepairsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [showMyTasksOnly, setShowMyTasksOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(15); // 15 seconds refresh
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Date Filtering State
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [filter, setFilter] = useState("all");

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = {
    total: repairs.length,
    today: repairs.filter((r) => {
      const createdAt = new Date(r.createdAt);
      createdAt.setHours(0, 0, 0, 0);
      return createdAt.getTime() === today.getTime();
    }).length,
    pending: repairs.filter((r) => r.status === "PENDING").length,
    inProgress: repairs.filter((r) => r.status === "IN_PROGRESS").length,
    completed: repairs.filter((r) => r.status === "COMPLETED").length,
    cancelled: repairs.filter((r) => r.status === "CANCELLED").length,
  };

  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    const filter = searchParams.get("filter");

    if (status) setFilterStatus(status);
    if (date) setFilterDate(date);
    if (filter) setFilterType(filter);
  }, [searchParams]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (userId) {
          const user = await userService.getUserById(parseInt(userId));
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };
    fetchUser();
  }, []);

  const fetchRepairs = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setIsRefreshing(true);

      const data = await apiFetch("/api/repairs");
      setRepairs((data as Repair[]) || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching repairs:", err);
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRepairs();
  }, [fetchRepairs]);

  // Auto-refresh countdown logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (autoRefreshEnabled) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            fetchRepairs(false);
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [autoRefreshEnabled, fetchRepairs]);

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
      const start = new Date(target);
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

  const getUrgencyLabel = (u: string) => {
    const labels: any = {
      NORMAL: "ปกติ",
      URGENT: "ด่วน",
      CRITICAL: "ด่วนที่สุด",
    };
    return labels[u] || u;
  };

  const isSameWeek = (date1: Date, date2: Date) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    const firstDay = new Date(d2);
    const day = d2.getDay();
    const diff = d2.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    firstDay.setDate(diff);

    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);

    return d1 >= firstDay && d1 <= lastDay;
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredRepairs = repairs.filter((item) => {
    const matchesSearch =
      item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.problemTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reporterName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all"
        ? true
        : filterStatus === "TODAY"
          ? new Date(item.createdAt).toDateString() ===
            new Date().toDateString()
          : item.status === filterStatus;

    // Date filtering
    let matchesDate = true;
    if (filter !== "all") {
      const createdAt = new Date(item.createdAt);
      const targetDate = new Date(selectedDate);

      if (filter === "day") {
        matchesDate = createdAt.toDateString() === targetDate.toDateString();
      } else if (filter === "week") {
        // Start from selectedDate and go +6 days
        const start = new Date(targetDate);
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

    const matchesPriority =
      filterPriority === "all" || item.urgency === filterPriority;

    // Filter by assignee if "My Tasks" is checked
    const matchesAssignee = showMyTasksOnly
      ? currentUser && item.assignees?.some((a) => a.user.id === currentUser.id)
      : true;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority &&
      matchesAssignee &&
      matchesDate
    );
  });

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);
  const paginatedRepairs = filteredRepairs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleExportExcel = async () => {
    if (repairs.length === 0) {
      Swal.fire({ icon: "info", title: "ไม่มีข้อมูลสำหรับส่งออก" });
      return;
    }

    try {
      Swal.fire({
        title: "กำลังเตรียมรายงาน...",
        text: "ระบบกำลังจัดรูปแบบไฟล์ Excel ให้สวยงาม",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const { periodLabel, rangeText } = getDateRangeInfo();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("รายการแจ้งซ่อม");

      // --- Styles ---
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

      // --- Content ---
      // Title & Meta
      const titleRow = sheet.addRow([
        "รายงานสรุปรายการแจ้งซ่อม",
      ]);
      titleRow.font = { size: 16, bold: true, color: { argb: "FF1E3A8A" } };
      sheet.mergeCells(1, 1, 1, 6);
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

      // Table Header
      const headers = [
        "รหัส",
        "วันที่/เวลา",
        "ปัญหา",
        "สถานที่",
        "ความเร่งด่วน",
        "สถานะ",
      ];
      const headerRow = sheet.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = whiteText;
        cell.border = borderStyle;
        cell.alignment = { horizontal: "center" };
      });

      sheet.columns = [
        { key: "id", width: 18 },
        { key: "date", width: 22 },
        { key: "title", width: 35 },
        { key: "loc", width: 25 },
        { key: "urgency", width: 18 },
        { key: "status", width: 15 },
      ];

      // Data Rows
      filteredRepairs.forEach((repair, index) => {
        const row = sheet.addRow([
          repair.ticketCode,
          new Date(repair.createdAt).toLocaleDateString("th-TH") +
            " " +
            new Date(repair.createdAt).toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          repair.problemTitle,
          repair.location,
          getUrgencyLabel(repair.urgency),
          statusLabels[repair.status] || repair.status,
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
        const uCell = row.getCell(5);
        if (repair.urgency === "CRITICAL")
          uCell.font = { color: { argb: "FFEF4444" }, bold: true };
        else if (repair.urgency === "URGENT")
          uCell.font = { color: { argb: "FFF59E0B" }, bold: true };

        // Status Color
        const sCell = row.getCell(6);
        if (repair.status === "COMPLETED")
          sCell.font = { color: { argb: "FF10B981" }, bold: true };
        else if (repair.status === "IN_PROGRESS")
          sCell.font = { color: { argb: "FFF59E0B" }, bold: true };
        else if (repair.status === "CANCELLED")
          sCell.font = { color: { argb: "FFEF4444" }, bold: true };
      });

      // --- Export ---
      const buffer = await workbook.xlsx.writeBuffer();
      const dateSuffix = new Date().toISOString().split("T")[0];
      saveAs(
        new Blob([buffer]),
        `RepairReport_${periodLabel}_${dateSuffix}.xlsx`,
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
      console.error("Export error:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel",
      });
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Filter Row Indicator */}
        {filterDate && filterType !== "all" && (
          <div className="bg-[#5D2E1F]/5 border border-[#5D2E1F]/10 px-4 py-2 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#5D2E1F]">
              <Clock size={16} />
              <span className="text-sm">
                กำลังแสดงข้อมูล:{" "}
                <strong>
                  {filterType === "day"
                    ? "รายวัน"
                    : filterType === "week"
                      ? "รายสัปดาห์"
                      : "รายเดือน"}
                </strong>
                ประจำวันที่ <strong>{formatDisplayDate(filterDate)}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                setFilterDate(null);
                setFilterType("all");
                router.push("/admin/repairs");
              }}
              className="text-sm text-[#5D2E1F] font-medium hover:underline"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {/* Row 1: Search + My Tasks + Export */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-sm w-full">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อผู้แจ้ง/เลขรหัส"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-4 pr-20 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                  ค้นหา
                </button>
              </div>

              {/* My Tasks Toggle */}
              <button
                onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                  showMyTasksOnly
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    showMyTasksOnly
                      ? "bg-amber-500 border-amber-500"
                      : "border-gray-400"
                  }`}
                >
                  {showMyTasksOnly && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                งานของฉัน
              </button>

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
                <span className="text-xs font-medium text-green-700">
                  {autoRefreshEnabled ? "เรียลไทม์" : "หยุดชั่วคราว"}
                </span>
                <span className="text-green-300">|</span>
                <span className="text-xs text-green-600">{countdown}s</span>
                <span className="text-green-300">|</span>
                <Clock size={12} className="text-green-500" />
                <span className="text-xs text-green-600">
                  {lastUpdated.toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`p-1.5 rounded-lg border transition-colors ${autoRefreshEnabled ? "text-orange-500 border-orange-200 hover:bg-orange-50" : "text-green-500 border-green-200 hover:bg-green-50"}`}
                title={
                  autoRefreshEnabled
                    ? "หยุดรีเฟรชอัตโนมัติ"
                    : "เปิดรีเฟรชอัตโนมัติ"
                }
              >
                {autoRefreshEnabled ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={() => {
                  fetchRepairs(false);
                  setCountdown(15);
                }}
                className={`p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors ${isRefreshing ? "animate-spin" : ""}`}
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Download size={16} className="text-gray-500" />
              Export
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Row 2: Date Filters + Status/Priority Dropdowns */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Date Filtering Tabs */}
            <div className="flex items-center gap-2">
              <div className="inline-flex bg-gray-100 rounded-lg p-1 h-9">
                {(["all", "day", "week", "month"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
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
                  selectedDate={(() => {
                    const [y, m, d] = selectedDate.split("-").map(Number);
                    return new Date(y, m - 1, d);
                  })()}
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
            <div className="flex-1" />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="all">ทุกสถานะ</option>
              <option value="TODAY">งานวันนี้</option>
              <option value="PENDING">รอดำเนินการ</option>
              <option value="IN_PROGRESS">กำลังดำเนินการ</option>
              <option value="COMPLETED">เสร็จสิ้น</option>
              <option value="CANCELLED">ยกเลิก</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <option value="all">ทุกความสำคัญ</option>
              <option value="NORMAL">ปกติ</option>
              <option value="URGENT">ด่วน</option>
              <option value="CRITICAL">ด่วนมาก</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
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
                    <span className="text-sm text-gray-900">
                      {repair.problemTitle}
                    </span>
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
                      {repair.urgency === "CRITICAL"
                        ? "ด่วนมาก"
                        : repair.urgency === "URGENT"
                          ? "ด่วน"
                          : "ปกติ"}
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
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          router.push(`/admin/repairs/${repair.ticketCode}`)
                        }
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedRepairs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
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
          {paginatedRepairs.map((repair) => (
            <div
              key={repair.id}
              className="bg-white rounded-lg p-4"
              onClick={() => router.push(`/admin/repairs/${repair.ticketCode}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-gray-500">
                  {repair.ticketCode}
                </span>
                <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                  {statusLabels[repair.status] || repair.status}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {repair.problemTitle}
              </p>
              <p className="text-xs text-gray-500">{repair.location}</p>
              <div className="flex justify-end items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
          {paginatedRepairs.length === 0 && (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              ไม่พบรายการ
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
                    setCurrentPage(1); // Reset to first page when changing page size
                  }}
                  className="appearance-none bg-transparent pl-2 pr-6 py-1 cursor-pointer outline-none hover:bg-gray-50 rounded"
                >
                  <option value={10}>10</option>
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

            {/* Display range e.g. "1-100 of 3543" */}
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
                title="Previous page"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="p-1 text-gray-800 hover:text-black disabled:opacity-30 disabled:hover:text-gray-800 transition-colors"
                title="Next page"
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

function StatCard({
  label,
  value,
  type,
  isToday = false,
  className = "",
}: {
  label: string;
  value: number;
  type: "purple" | "orange" | "green" | "red" | "blue";
  isToday?: boolean;
  className?: string;
}) {
  const styleMap: Record<string, { bg: string; iconBg: string }> = {
    purple: {
      bg: "bg-[#4F00FF]",
      iconBg: "bg-[#6B46FF]",
    },
    orange: {
      bg: "bg-[#FF9F00]",
      iconBg: "bg-[#FFB733]",
    },
    green: {
      bg: "bg-[#00A661]",
      iconBg: "bg-[#33B881]",
    },
    red: {
      bg: "bg-[#FF0032]",
      iconBg: "bg-[#FF335B]",
    },
    blue: {
      bg: "bg-[#2563EB]",
      iconBg: "bg-[#3B82F6]",
    },
  };

  const style = styleMap[type];

  return (
    <div
      className={`relative rounded-xl p-4 ${style.bg} shadow-md flex flex-col items-center justify-center min-h-[100px] transition-transform hover:scale-[1.02] cursor-default ${className}`}
    >
      {isToday && (
        <div
          className={`absolute top-2 right-2 p-1 rounded-full ${style.iconBg} text-white`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M7 17L17 7M17 7H7M17 7V17"
            />
          </svg>
        </div>
      )}
      <span className="text-xs font-bold text-white/90 mb-1">{label}</span>
      <span className="text-3xl font-black text-white tracking-tight">
        {value}
      </span>
    </div>
  );
}

export default function AdminRepairsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminRepairsContent />
    </Suspense>
  );
}
