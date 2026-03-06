// ===== แดชบอร์ดแอดมิน | Admin Dashboard =====
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../services/api";
import { ChevronRight, Calendar, ArrowUpRight, Download } from "lucide-react";
import CalendarPop from "../../../components/CalendarPop";
import Loading from "@/components/Loading";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";

interface RepairItem {
  id: number;
  ticketCode: string;
  problemTitle: string;
  status: string;
  urgency: string;
  location: string;
  createdAt: string;
}

interface DashboardStats {
  all: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  filtered: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  recentRepairs: RepairItem[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

interface DepartmentStat {
  department: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

type FilterType = "day" | "week" | "month";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("day");
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    const loadDashboardData = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);

        // Fetch dashboard statistics with filter and department statistics in parallel
        const [dashboardStats, deptStats] = await Promise.all([
          apiFetch(
            `/api/repairs/statistics/dashboard?filter=${filter}&date=${selectedDate}`,
            "GET",
          ),
          apiFetch(
            `/api/repairs/statistics/by-department?filter=${filter}&date=${selectedDate}`,
            "GET",
          ),
        ]);

        setStats(dashboardStats);
        setDepartmentStats(Array.isArray(deptStats) ? deptStats : []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    // Initial load with spinner
    loadDashboardData(true);

    // Set interval for real-time updates (every 30 seconds) without spinner
    const interval = setInterval(() => loadDashboardData(false), 30000);

    return () => clearInterval(interval);
  }, [filter, selectedDate]);

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      CRITICAL: "ด่วนที่สุด",
      URGENT: "ด่วน",
      NORMAL: "ปกติ",
    };
    return labels[urgency] || urgency;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "รอดำเนินการ";
      case "ASSIGNED":
        return "มอบหมายแล้ว";
      case "IN_PROGRESS":
        return "กำลังดำเนินการ";
      case "COMPLETED":
        return "เสร็จสิ้น";
      case "CANCELLED":
        return "ยกเลิก";
      default:
        return status;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Helper: compute date range for export metadata
  const getDateRangeInfo = () => {
    const target = new Date(selectedDate);

    const formatThai = (d: Date) =>
      d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    if (filter === "day") {
      return {
        periodLabel: "รายวัน",
        rangeText: formatThai(target),
      };
    } else if (filter === "week") {
      const day = target.getDay(); // 0=Sun, 1=Mon...
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
        rangeText: `${formatThai(firstDay)} ถึง ${formatThai(lastDay)}`,
      };
    }
  };

  const handleExportDashboard = async () => {
    try {
      Swal.fire({
        title: "กำลังเตรียมรายงาน...",
        text: "ระบบกำลังจัดรูปแบบไฟล์ Excel",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const fullStats = await apiFetch(
        "/api/repairs/statistics/dashboard?filter=" +
          filter +
          "&date=" +
          selectedDate +
          "&limit=500",
        "GET",
      );

      if (!fullStats || !departmentStats) {
        Swal.close();
        return;
      }

      const { periodLabel, rangeText } = getDateRangeInfo();
      const workbook = new ExcelJS.Workbook();

      // --- Style Helpers ---
      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Dark Blue (Indigo 900)
      };

      const subHeaderFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" }, // Light Gray (Slate 100)
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

      // ==========================================
      // SHEET 1: สรุปภาพรวม (Summary)
      // ==========================================
      const sheet1 = workbook.addWorksheet("สรุปภาพรวม");
      sheet1.getColumn(1).width = 30;
      sheet1.getColumn(2).width = 45;

      // Title
      const titleRow = sheet1.addRow(["รายงานสรุปผลการแจ้งซ่อม"]);
      titleRow.font = { size: 16, bold: true, color: { argb: "FF1E3A8A" } };
      sheet1.mergeCells(1, 1, 1, 2);
      sheet1.addRow([]); // Spacer

      // Meta Info
      const addDetailRow = (label: string, value: any) => {
        const row = sheet1.addRow([label, value]);
        row.getCell(1).font = { bold: true };
        row.getCell(1).fill = subHeaderFill;
      };

      addDetailRow("ประเภทรายงาน", periodLabel);
      addDetailRow("ช่วงเวลาของข้อมูล", rangeText);
      addDetailRow("วันที่ส่งออก", new Date().toLocaleString("th-TH"));
      sheet1.addRow([]);

      // All Stats Header
      const allHeader = sheet1.addRow(["สถิติสะสมทั้งหมด", ""]);
      allHeader.getCell(1).fill = headerFill;
      allHeader.getCell(1).font = whiteText;
      sheet1.mergeCells(allHeader.number, 1, allHeader.number, 2);

      addDetailRow("รายการซ่อมทั้งหมด", fullStats.all.total);
      addDetailRow("รอดำเนินการ (สะสม)", fullStats.all.pending);
      addDetailRow("กำลังดำเนินการ (สะสม)", fullStats.all.inProgress);
      addDetailRow("เสร็จสิ้น (สะสม)", fullStats.all.completed);
      addDetailRow("ยกเลิก (สะสม)", fullStats.all.cancelled);
      sheet1.addRow([]);

      // Filtered Stats Header
      const filteredHeader = sheet1.addRow([
        "สถิติในช่วงเวลา: " + rangeText,
        "",
      ]);
      filteredHeader.getCell(1).fill = headerFill;
      filteredHeader.getCell(1).font = whiteText;
      sheet1.mergeCells(filteredHeader.number, 1, filteredHeader.number, 2);

      addDetailRow("จำนวนรายการใหม่", fullStats.filtered.total);
      addDetailRow("รอดำเนินการ", fullStats.filtered.pending);
      addDetailRow("กำลังดำเนินการ", fullStats.filtered.inProgress);
      addDetailRow("เสร็จสิ้น", fullStats.filtered.completed);
      addDetailRow("ยกเลิก", fullStats.filtered.cancelled);

      // ==========================================
      // SHEET 2: สถิติรายแผนก (Department)
      // ==========================================
      const sheet2 = workbook.addWorksheet("สถิติรายแผนก");
      const deptHeaders = [
        "แผนก",
        "รอดำเนินการ",
        "กำลังดำเนินการ",
        "เสร็จสิ้น",
        "ยกเลิก",
        "รวมทั้งหมด",
      ];
      const deptHeaderRow = sheet2.addRow(deptHeaders);

      sheet2.columns = [
        { header: "แผนก", key: "dept", width: 25 },
        { header: "รอดำเนินการ", key: "p", width: 15 },
        { header: "กำลังดำเนินการ", key: "i", width: 18 },
        { header: "เสร็จสิ้น", key: "c", width: 12 },
        { header: "ยกเลิก", key: "x", width: 10 },
        { header: "รวมทั้งหมด", key: "t", width: 15 },
      ];

      deptHeaderRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = whiteText;
        cell.alignment = { horizontal: "center" };
        cell.border = borderStyle;
      });

      departmentStats.forEach((dept) => {
        const row = sheet2.addRow([
          dept.department,
          dept.pending,
          dept.inProgress,
          dept.completed,
          dept.cancelled,
          dept.total,
        ]);
        row.eachCell((cell) => {
          cell.border = borderStyle;
          cell.alignment = { horizontal: "center" };
        });
        row.getCell(1).alignment = { horizontal: "left" };
      });

      // ==========================================
      // SHEET 3: รายการแจ้งซ่อม (Repairs)
      // ==========================================
      const sheet3 = workbook.addWorksheet("รายการแจ้งซ่อม");
      const repairHeaders = [
        "รหัส",
        "วันที่",
        "ปัญหา",
        "สถานที่",
        "ความเร่งด่วน",
        "สถานะ",
      ];
      const rHeaderRow = sheet3.addRow(repairHeaders);

      sheet3.columns = [
        { header: "รหัส", key: "id", width: 20 },
        { header: "วันที่", key: "date", width: 22 },
        { header: "ปัญหา", key: "title", width: 40 },
        { header: "สถานที่", key: "loc", width: 25 },
        { header: "ความเร่งด่วน", key: "urgency", width: 18 },
        { header: "สถานะ", key: "status", width: 15 },
      ];

      rHeaderRow.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = whiteText;
        cell.border = borderStyle;
        cell.alignment = { horizontal: "center" };
      });

      const sortedRepairs = [...(fullStats.recentRepairs || [])].sort(
        (a: any, b: any) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      sortedRepairs.forEach((repair: any, index) => {
        const row = sheet3.addRow([
          repair.ticketCode,
          formatDate(repair.createdAt) + " " + formatTime(repair.createdAt),
          repair.problemTitle,
          repair.location,
          getUrgencyLabel(repair.urgency),
          getStatusLabel(repair.status),
        ]);

        // Alternating row color
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

        // Urgency Color Coding
        const urgencyCell = row.getCell(5);
        if (repair.urgency === "CRITICAL") {
          urgencyCell.font = { color: { argb: "FFEF4444" }, bold: true }; // Red
        } else if (repair.urgency === "URGENT") {
          urgencyCell.font = { color: { argb: "FFF59E0B" }, bold: true }; // Amber
        }

        // Status Color Coding
        const statusCell = row.getCell(6);
        if (repair.status === "COMPLETED") {
          statusCell.font = { color: { argb: "FF10B981" }, bold: true }; // Green
        } else if (repair.status === "IN_PROGRESS") {
          statusCell.font = { color: { argb: "FFF59E0B" }, bold: true }; // Amber
        } else if (repair.status === "CANCELLED") {
          statusCell.font = { color: { argb: "FFEF4444" }, bold: true }; // Red
        }
      });

      // --- Download ---
      const buffer = await workbook.xlsx.writeBuffer();
      const dateSuffix = new Date().toISOString().split("T")[0];
      const filename = "Dashboard_" + periodLabel + "_" + dateSuffix + ".xlsx";

      saveAs(new Blob([buffer]), filename);

      Swal.close();
      Swal.fire({
        icon: "success",
        title: "ส่งออกข้อมูลสำเร็จ",
        text: "ไฟล์รายงานถูกสร้างและจัดรูปแบบเรียบร้อยแล้ว",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Export failed:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถส่งออกข้อมูลได้ในขณะนี้",
      });
    }
  };
  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            แดชบอร์ด
          </h1>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm overflow-x-auto max-w-full">
              {(["day", "week", "month"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap ${
                    filter === f
                      ? "text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                  style={{
                    backgroundColor: filter === f ? "#5D2E1E" : undefined,
                    color: filter === f ? "#ffffff" : undefined,
                  }}
                >
                  {f === "day"
                    ? "รายวัน"
                    : f === "week"
                      ? "รายสัปดาห์"
                      : "รายเดือน"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {/* Date Picker */}
              <CalendarPop
                selectedDate={(() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  return new Date(y, m - 1, d);
                })()}
                onChange={(date: Date) => {
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, "0");
                  const day = String(date.getDate()).padStart(2, "0");
                  setSelectedDate(`${year}-${month}-${day}`);
                }}
                align="right"
              />

              <button
                onClick={handleExportDashboard}
                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-all text-sm font-medium"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Stats Cards Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <MainStatItem
            label={"รายการซ่อมทั้งหมด"}
            value={stats?.all.total || 0}
          />
          <MainStatItem label={"รอดำเนินการ"} value={stats?.all.pending || 0} />
          <MainStatItem
            label={"กำลังดำเนินการ"}
            value={stats?.all.inProgress || 0}
          />
          <MainStatItem label={"เสร็จสิ้น"} value={stats?.all.completed || 0} />
          <MainStatItem label={"ยกเลิก"} value={stats?.all.cancelled || 0} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
          <TodayStatCard
            label={`รายการซ่อม(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.total || 0}
            link={`/admin/repairs?filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`รอดำเนินการ(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.pending || 0}
            link={`/admin/repairs?status=PENDING&filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`กำลังดำเนินการ(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.inProgress || 0}
            link={`/admin/repairs?status=IN_PROGRESS&filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`เสร็จสิ้น(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.completed || 0}
            link={`/admin/repairs?status=COMPLETED&filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`ยกเลิก(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.cancelled || 0}
            link={`/admin/repairs?status=CANCELLED&filter=${filter}&date=${selectedDate}`}
          />
        </div>

        {/* Repairs Table (Desktop) & Cards (Mobile) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              รายการแจ้งซ่อมล่าสุด
            </h2>
            <Link
              href={`/admin/repairs?filter=${filter}&date=${selectedDate}`}
              className="text-sm font-medium text-blue-600 hover:text-brown-800 transition-colors"
            >
              ดูทั้งหมด
            </Link>
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    รหัส
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    เวลา
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    ปัญหา
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    สถานที่
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    ความเร่งด่วน
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    สถานะ
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentRepairs.slice(0, 7).map((repair) => (
                  <tr
                    key={repair.id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {repair.ticketCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(repair.createdAt)}{" "}
                      {formatTime(repair.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {repair.problemTitle.length > 30
                        ? repair.problemTitle.substring(0, 30) + "..."
                        : repair.problemTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {repair.location}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {repair.urgency === "CRITICAL" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                          ด่วนที่สุด
                        </span>
                      )}
                      {repair.urgency === "URGENT" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">
                          ด่วน
                        </span>
                      )}
                      {repair.urgency !== "CRITICAL" &&
                        repair.urgency !== "URGENT" && (
                          <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                            ปกติ
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {repair.status === "PENDING" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-sky-100 text-sky-700 rounded-full">
                          รอดำเนินการ
                        </span>
                      )}
                      {repair.status === "ASSIGNED" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                          มอบหมายแล้ว
                        </span>
                      )}
                      {repair.status === "IN_PROGRESS" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                          กำลังดำเนินการ
                        </span>
                      )}
                      {repair.status === "COMPLETED" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                          เสร็จสิ้น
                        </span>
                      )}
                      {repair.status === "CANCELLED" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
                          ยกเลิก
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/repairs/${repair.ticketCode}`}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight size={20} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentRepairs ||
                  stats.recentRepairs.length === 0) && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      ไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout - visible only on mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {stats?.recentRepairs.slice(0, 7).map((repair) => (
              <Link
                key={repair.id}
                href={`/admin/repairs/${repair.ticketCode}`}
                className="block px-4 py-3 hover:bg-blue-50 active:bg-blue-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500">
                        {repair.ticketCode}
                      </span>
                      {repair.status === "PENDING" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-700 rounded-full">
                          รอดำเนินการ
                        </span>
                      )}
                      {repair.status === "ASSIGNED" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 rounded-full">
                          มอบหมายแล้ว
                        </span>
                      )}
                      {repair.status === "IN_PROGRESS" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                          กำลังดำเนินการ
                        </span>
                      )}
                      {repair.status === "COMPLETED" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                          เสร็จสิ้น
                        </span>
                      )}
                      {repair.status === "CANCELLED" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700 rounded-full">
                          ยกเลิก
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {repair.problemTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{repair.location}</span>
                      <span>•</span>
                      <span>
                        {formatDate(repair.createdAt)}{" "}
                        {formatTime(repair.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-gray-400 mt-1 flex-shrink-0"
                  />
                </div>
              </Link>
            ))}
            {(!stats?.recentRepairs || stats.recentRepairs.length === 0) && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                ไม่มีรายการ
              </div>
            )}
          </div>
        </div>

        {/* Department Statistics */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            จำนวนรายการแจ้งซ่อมของแต่ละแผนก
            <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
              (
              {filter === "day"
                ? `วันที่ ${formatDisplayDate(selectedDate)}`
                : filter === "week"
                  ? `สัปดาห์ของ ${formatDisplayDate(selectedDate)}`
                  : `เดือน ${new Date(selectedDate).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`}
              )
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {departmentStats.length > 0
              ? departmentStats.map((dept) => (
                  <DepartmentCard key={dept.department} stat={dept} />
                ))
              : "ไม่มีข้อมูลในช่วงเวลาที่เลือก"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Stat Card Component
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-2">
        <span className="text-4xl font-bold text-gray-900">{value}</span>
      </div>
    </div>
  );
}

// Main Stat Item Component (Internal use for the main card)
function MainStatItem({ label, value }: { label: string; value: number }) {
  const colorMap: Record<string, string> = {
    รายการซ่อมทั้งหมด: "bg-blue-600 text-white",
    รอดำเนินการ: "bg-sky-500 text-white",
    กำลังดำเนินการ: "bg-amber-500 text-white",
    เสร็จสิ้น: "bg-emerald-600 text-white",
    ยกเลิก: "bg-rose-600 text-white",
  };

  const colorClass = colorMap[label] || "bg-blue-600 text-white";

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 sm:p-5 min-w-0 w-full rounded-xl shadow-md transition-all hover:scale-[1.05] hover:shadow-xl min-h-[90px] sm:min-h-[110px] ${colorClass}`}
    >
      <span className="text-[10px] sm:text-xs mb-1 text-center font-bold uppercase tracking-wider leading-tight">
        {label}
      </span>
      <span className="text-2xl sm:text-3xl font-black">{value}</span>
    </div>
  );
}

// Today Stat Card with link
function TodayStatCard({
  label,
  value,
  link,
}: {
  label: string;
  value: number;
  link: string;
}) {
  let colorClass = "bg-blue-600 text-white";

  if (label.includes("รอดำเนินการ")) colorClass = "bg-sky-500 text-white";
  if (label.includes("กำลังดำเนินการ")) colorClass = "bg-amber-500 text-white";
  if (label.includes("เสร็จสิ้น")) colorClass = "bg-emerald-600 text-white";
  if (label.includes("ยกเลิก")) colorClass = "bg-rose-600 text-white";

  return (
    <Link
      href={link}
      className={`relative border-0 p-3 sm:p-5 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.05] transition-all group flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px] min-w-0 w-full ${colorClass}`}
    >
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1 sm:p-1.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors">
        <ArrowUpRight className="text-white w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
      </div>

      <span className="text-[10px] sm:text-xs mb-1 font-bold text-center leading-tight uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl sm:text-3xl font-black">{value}</span>
    </Link>
  );
}

// Department Card Component
function DepartmentCard({ stat }: { stat: DepartmentStat }) {
  return (
    <div className="bg-white border-0 p-4 sm:p-5 rounded-xl shadow-md hover:shadow-xl transition-all hover:scale-[1.05] border-t-4 border-blue-600">
      <div className="text-center mb-2 sm:mb-3">
        <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tighter">
          {stat.department}
        </span>
      </div>
      <div className="text-center mb-3 sm:mb-4">
        <span className="text-3xl sm:text-4xl font-black text-slate-900">
          {stat.total}
        </span>
      </div>
      <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
        <div className="flex justify-between font-bold text-blue-600 border-r-4 border-blue-400 pr-2 bg-blue-50 py-1.5 rounded-l">
          <span>รอดำเนินการ :</span>
          <span>{stat.pending}</span>
        </div>
        <div className="flex justify-between font-bold text-amber-600 border-r-4 border-amber-500 pr-2 bg-amber-50 py-1.5 rounded-l">
          <span>กำลังดำเนินการ :</span>
          <span>{stat.inProgress}</span>
        </div>
        <div className="flex justify-between font-bold text-emerald-600 border-r-4 border-emerald-500 pr-2 bg-emerald-50 py-1.5 rounded-l">
          <span>เสร็จสิ้น :</span>
          <span>{stat.completed}</span>
        </div>
        <div className="flex justify-between font-bold text-rose-600 border-r-4 border-rose-500 pr-2 bg-rose-50 py-1.5 rounded-l">
          <span>ยกเลิก :</span>
          <span>{stat.cancelled}</span>
        </div>
      </div>
    </div>
  );
}
