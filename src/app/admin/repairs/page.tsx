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
import * as XLSX from "xlsx";
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

    // Date filtering from dashboard
    let matchesDate = true;
    if (filterDate && filterType !== "all") {
      const createdAt = new Date(item.createdAt);
      const targetDate = new Date(filterDate);

      if (filterType === "day") {
        matchesDate = createdAt.toDateString() === targetDate.toDateString();
      } else if (filterType === "week") {
        matchesDate = isSameWeek(createdAt, targetDate);
      } else if (filterType === "month") {
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

  const handleExportExcel = () => {
    if (repairs.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    try {
      // Apply export limit based on rows per page
      const dataToExport = filteredRepairs.slice(0, itemsPerPage);

      // 1. Prepare and format data for export
      const exportData = dataToExport.map((repair) => ({
        เลขใบงาน: repair.ticketCode,
        วันที่แจ้ง: new Date(repair.createdAt).toLocaleDateString("th-TH"),
        เวลาที่แจ้ง: new Date(repair.createdAt).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        "ปัญหา/รายการ": repair.problemTitle,
        สถานที่: repair.location,
        ความสำคัญ:
          repair.urgency === "CRITICAL"
            ? "ด่วนมาก"
            : repair.urgency === "URGENT"
              ? "ด่วน"
              : "ปกติ",
        ชื่อผู้แจ้ง: repair.reporterName || "-",
        แผนก: repair.reporterDepartment || "-",
        เบอร์โทรศัพท์: repair.reporterPhone || "-",
        สถานะ: statusLabels[repair.status] || repair.status,
        ผู้รับผิดชอบ:
          repair.assignees && repair.assignees.length > 0
            ? repair.assignees.map((a) => a.user.name).join(", ")
            : "ยังไม่มีผู้รับงาน",
      }));

      // 2. Create Workbook and Worksheet
      const wb = XLSX.utils.book_new();

      // Create Worksheet with professional headers
      const ws = XLSX.utils.aoa_to_sheet([
        ["รายงานการแจ้งซ่อม (Repair Management Report)"],
        [
          `วันที่พิมพ์: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          `จำนวนทั้งหมด: ${dataToExport.length} รายการ`,
        ],
        [""], // Spacer
      ]);

      // Add actual data starting from row 4
      XLSX.utils.sheet_add_json(ws, exportData, { origin: "A4" });

      // 3. Set Styles and Layout
      // Set Column Widths
      ws["!cols"] = [
        { wch: 20 }, // เลขใบงาน
        { wch: 15 }, // วันที่แจ้ง
        { wch: 10 }, // เวลาที่แจ้ง
        { wch: 30 }, // ปัญหา/รายการ
        { wch: 20 }, // สถานที่
        { wch: 12 }, // ความสำคัญ
        { wch: 20 }, // ชื่อผู้แจ้ง
        { wch: 15 }, // แผนก
        { wch: 15 }, // เบอร์โทรศัพท์
        { wch: 15 }, // สถานะ
        { wch: 20 }, // ผู้รับผิดชอบ
      ];

      // Merge Title Cells
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }, // Main Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Date info
        { s: { r: 1, c: 5 }, e: { r: 1, c: 10 } }, // Summary info
      ];

      // 4. Download File
      XLSX.utils.book_append_sheet(wb, ws, "รายละเอียดการแจ้งซ่อม");
      const fileName = `รายละเอียดการแจ้งซ่อม_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Export error:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-3">
            <StatCard label="รายการวันนี้" value={stats.today} />
            <StatCard label="รายการทั้งหมด" value={stats.total} />
          </div>
          <StatCard
            label="รอดำเนินการ"
            value={stats.pending}
            className="h-full min-h-[140px]"
          />
          <StatCard
            label="กำลังดำเนินการ"
            value={stats.inProgress}
            className="h-full min-h-[140px]"
          />
          <div className="flex flex-col gap-3">
            <StatCard label="เสร็จสิ้น" value={stats.completed} />
            <StatCard label="ยกเลิก" value={stats.cancelled} />
          </div>
        </div>

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

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้แจ้ง/เลขรหัส"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                ค้นหา
              </button>
            </div>

            {/* My Tasks Toggle */}
            <button
              onClick={() => setShowMyTasksOnly(!showMyTasksOnly)}
              className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
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
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none"
            >
              <option value="all">ทุกความสำคัญ</option>
              <option value="NORMAL">ปกติ</option>
              <option value="URGENT">ด่วน</option>
              <option value="CRITICAL">ด่วนมาก</option>
            </select>
          </div>

          {/* Export Button & Real-time Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                {autoRefreshEnabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${autoRefreshEnabled ? "bg-green-500" : "bg-gray-400"}`}
                ></span>
              </span>
              {autoRefreshEnabled ? "เรียลไทม์" : "ปิดเรียลไทม์"}
              <span className="text-green-300 mx-1">|</span>
              <span className="font-mono">{countdown}s</span>
              <span className="text-green-300 mx-1">|</span>
              <Clock size={12} className="inline mr-1" />
              {lastUpdated.toLocaleTimeString("th-TH")}
            </div>

            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`p-2 border border-gray-300 rounded-lg transition-colors ${
                autoRefreshEnabled
                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
              title={
                autoRefreshEnabled ? "ปิด Auto Refresh" : "เปิด Auto Refresh"
              }
            >
              {autoRefreshEnabled ? <Pause size={18} /> : <Play size={18} />}
            </button>

            <button
              onClick={() => {
                fetchRepairs(false);
                setCountdown(15);
              }}
              disabled={isRefreshing}
              className="p-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw
                size={18}
                className={`text-gray-600 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:bg-gray-50 font-medium flex items-center gap-2"
            >
              <Download size={16} className="text-gray-500" />
              Export
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
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
                  onClick={() => router.push(`/admin/repairs/${repair.id}`)}
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
                          router.push(`/admin/repairs/${repair.id}`)
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
              onClick={() => router.push(`/admin/repairs/${repair.id}`)}
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
  className = "",
}: {
  label: string;
  value: number;
  className?: string;
}) {
  const colorMap: Record<string, string> = {
    รายการวันนี้: "bg-purple-600 text-white",
    รายการทั้งหมด: "bg-blue-600 text-white",
    รอการดำเนินการ: "bg-sky-500 text-white",
    กำลังดำเนินการ: "bg-amber-500 text-white",
    เสร็จสิ้น: "bg-emerald-600 text-white",
    ยกเลิก: "bg-rose-600 text-white",
  };

  const colorClass = colorMap[label] || "bg-blue-600 text-white";

  return (
    <div
      className={`rounded-xl p-4 flex flex-col items-center justify-center shadow-md ${colorClass} ${className}`}
    >
      <span className="text-sm font-bold mb-1">{label}</span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

export default function AdminRepairsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          กำลังโหลด...
        </div>
      }
    >
      <AdminRepairsContent />
    </Suspense>
  );
}
