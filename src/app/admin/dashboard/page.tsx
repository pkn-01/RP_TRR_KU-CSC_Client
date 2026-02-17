"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../services/api";
import { ChevronRight, Calendar, ArrowUpRight } from "lucide-react";

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
    return today.toISOString().split("T")[0];
  });

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadDashboardData = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);

        // Fetch dashboard statistics with filter and department statistics in parallel
        const [dashboardStats, deptStats] = await Promise.all([
          apiFetch(
            `/api/repairs/statistics/dashboard?filter=${filter}&date=${selectedDate}`,
            "GET",
          ),
          apiFetch("/api/repairs/statistics/by-department", "GET"),
        ]);

        if (!isMounted) return; // PERF: Prevent state update on unmounted component
        setStats(dashboardStats);
        setDepartmentStats(Array.isArray(deptStats) ? deptStats : []);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load dashboard data:", error);
      } finally {
        if (showLoading && isMounted) setLoading(false);
      }
    };

    // Initial load with spinner
    loadDashboardData(true);

    // PERF: Reduced from 30s to 60s polling to cut server load by 50%
    const interval = setInterval(() => loadDashboardData(false), 60000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [filter, selectedDate]);

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      CRITICAL: "ด่วน",
      URGENT: "ด่วน",
      NORMAL: "ปกติ",
    };
    return labels[urgency] || urgency;
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

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, #fdf6f0 0%, #f0e6da 50%, #e8ddd2 100%)",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#5D2E1E", borderTopColor: "transparent" }}
          />
          <div style={{ color: "#5D2E1E" }} className="font-medium">
            กำลังโหลด...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{
        background:
          "linear-gradient(135deg, #fdf6f0 0%, #f0e6da 50%, #e8ddd2 100%)",
      }}
    >
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold" style={{ color: "#3B1A0E" }}>
            แดชบอร์ด
          </h1>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
              {(["day", "week", "month"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${
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

            {/* Date Picker */}
            <label className="relative flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="text-sm text-gray-600">
                  {formatDisplayDate(selectedDate)}
                </span>
                <Calendar size={18} className="text-gray-400" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
            </label>
          </div>
        </div>

        {/* Main Stats Cards */}
        {/* Main Stats Cards */}
        <div
          className="rounded-xl p-5 shadow-lg border"
          style={{
            background:
              "linear-gradient(135deg, #5D2E1E 0%, #8B4513 50%, #A0522D 100%)",
            borderColor: "rgba(93,46,30,0.3)",
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MainStatItem
              label="รายการซ่อมทั้งหมด"
              value={stats?.all.total || 0}

            />
            <MainStatItem
              label="กำลังดำเนินการ"
              value={stats?.all.inProgress || 0}

            />
            <MainStatItem
              label="ปิดงาน"
              value={stats?.all.completed || 0}
            />
            <MainStatItem
              label="ยกเลิก"
              value={stats?.all.cancelled || 0}
              
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TodayStatCard
            label={`รายการซ่อม(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.total || 0}
            link={`/admin/repairs?filter=${filter}&date=${selectedDate}`}
            color="#4F46E5"
            bgColor="#EEF2FF"

          />
          <TodayStatCard
            label={`กำลังดำเนินการ(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.inProgress || 0}
            link={`/admin/repairs?status=IN_PROGRESS&filter=${filter}&date=${selectedDate}`}
            color="#D97706"
            bgColor="#FFFBEB"

          />
          <TodayStatCard
            label={`ปิดงาน(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.completed || 0}
            link={`/admin/repairs?status=COMPLETED&filter=${filter}&date=${selectedDate}`}
            color="#059669"
            bgColor="#ECFDF5"

          />
          <TodayStatCard
            label={`ยกเลิก(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.cancelled || 0}
            link={`/admin/repairs?status=CANCELLED&filter=${filter}&date=${selectedDate}`}
            color="#DC2626"
            bgColor="#FEF2F2"

          />
        </div>

        {/* Repairs Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{
              background: "linear-gradient(90deg, #5D2E1E, #8B4513)",
              borderBottom: "2px solid rgba(93,46,30,0.1)",
            }}
          >
            <h2 className="text-lg font-semibold text-white">
              รายการแจ้งซ่อมล่าสุด
            </h2>
            <Link
              href="/admin/repairs"
              className="text-sm font-medium transition-colors px-3 py-1 rounded-full"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "#fff",
              }}
            >
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{ backgroundColor: "#faf6f3" }}
                  className="border-b border-gray-200"
                >
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    รหัส
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    เวลา
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    ปัญหา
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    สถานที่
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    ความเร่งด่วน
                  </th>
                  <th
                    className="text-left px-4 py-3 text-sm font-semibold"
                    style={{ color: "#5D2E1E" }}
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentRepairs.slice(0, 7).map((repair) => (
                  <tr
                    key={repair.id}
                    className="hover:bg-amber-50/40 transition-colors"
                  >
                    <td
                      className="px-4 py-3 text-sm font-mono font-semibold"
                      style={{ color: "#5D2E1E" }}
                    >
                      {repair.ticketCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(repair.createdAt)}{" "}
                      {formatTime(repair.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {repair.problemTitle.length > 30
                        ? repair.problemTitle.substring(0, 30) + "..."
                        : repair.problemTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {repair.location}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor:
                            repair.urgency === "CRITICAL" ||
                            repair.urgency === "URGENT"
                              ? "#FEE2E2"
                              : "#DBEAFE",
                          color:
                            repair.urgency === "CRITICAL" ||
                            repair.urgency === "URGENT"
                              ? "#DC2626"
                              : "#2563EB",
                        }}
                      >
                        {getUrgencyLabel(repair.urgency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/repairs/${repair.id}`}
                        className="p-1.5 rounded-full transition-colors"
                        style={{ color: "#5D2E1E" }}
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
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-500 text-sm"
                    >
                      ไม่มีรายการ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department Statistics */}
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#3B1A0E" }}>
            จำนวนรายการแจ้งซ่อมของแต่ละแผนก
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {departmentStats.map((dept, index) => (
              <DepartmentCard key={dept.department} stat={dept} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Stat Card Component (unused but kept for compatibility)
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="mt-2">
        <span className="text-4xl font-bold" style={{ color: "#5D2E1E" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

// Main Stat Item Component (Internal use for the main card)
function MainStatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center p-3 rounded-lg"
      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      {icon && <span className="text-lg mb-1">{icon}</span>}
      <span className="text-sm text-white/80 mb-1">{label}</span>
      <span className="text-3xl font-bold text-white">{value}</span>
    </div>
  );
}

// Today Stat Card with link
function TodayStatCard({
  label,
  value,
  link,
  color,
  bgColor,
  icon,
}: {
  label: string;
  value: number;
  link: string;
  color?: string;
  bgColor?: string;
  icon?: string;
}) {
  return (
    <Link
      href={link}
      className="relative border p-5 rounded-xl hover:shadow-lg transition-all duration-300 group flex flex-col items-center justify-center min-h-[120px]"
      style={{
        backgroundColor: bgColor || "#fff",
        borderColor: color ? `${color}30` : "#e5e7eb",
      }}
    >
      <div
        className="absolute top-2 right-2 p-1.5 rounded-full transition-colors group-hover:scale-110"
        style={{ backgroundColor: color ? `${color}20` : "#f3f4f6" }}
      >
        <ArrowUpRight size={16} style={{ color: color || "#6b7280" }} />
      </div>
      {icon && <span className="text-xl mb-1">{icon}</span>}
      <span
        className="text-sm mb-1 font-semibold"
        style={{ color: color || "#4b5563" }}
      >
        {label}
      </span>
      <span
        className="text-4xl font-bold"
        style={{ color: color || "#111827" }}
      >
        {value}
      </span>
    </Link>
  );
}

// Department Card Component
const deptGradients = [
  "linear-gradient(135deg, #5D2E1E, #8B4513)",
  "linear-gradient(135deg, #4F46E5, #7C3AED)",
  "linear-gradient(135deg, #059669, #10B981)",
  "linear-gradient(135deg, #D97706, #F59E0B)",
  "linear-gradient(135deg, #DC2626, #EF4444)",
  "linear-gradient(135deg, #0891B2, #06B6D4)",
  "linear-gradient(135deg, #7C3AED, #A78BFA)",
];

function DepartmentCard({
  stat,
  index,
}: {
  stat: DepartmentStat;
  index: number;
}) {
  const gradient = deptGradients[index % deptGradients.length];
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-2" style={{ background: gradient }} />
      <div className="p-4">
        <div className="text-center mb-3">
          <span className="text-sm font-bold" style={{ color: "#3B1A0E" }}>
            {stat.department}
          </span>
        </div>
        <div className="text-center mb-4">
          <span className="text-4xl font-bold" style={{ color: "#5D2E1E" }}>
            {stat.total}
          </span>
          <div className="text-xs text-gray-500 mt-1">รายการทั้งหมด</div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center bg-amber-50 rounded-lg px-2.5 py-1.5">
            <span className="text-amber-700 font-medium">รอดำเนินการ</span>
            <span className="font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full text-xs">
              {stat.pending}
            </span>
          </div>
          <div className="flex justify-between items-center bg-blue-50 rounded-lg px-2.5 py-1.5">
            <span className="text-blue-700 font-medium">กำลังดำเนินการ</span>
            <span className="font-bold text-blue-800 bg-blue-200 px-2 py-0.5 rounded-full text-xs">
              {stat.inProgress}
            </span>
          </div>
          <div className="flex justify-between items-center bg-green-50 rounded-lg px-2.5 py-1.5">
            <span className="text-green-700 font-medium">ปิดงาน</span>
            <span className="font-bold text-green-800 bg-green-200 px-2 py-0.5 rounded-full text-xs">
              {stat.completed}
            </span>
          </div>
          <div className="flex justify-between items-center bg-red-50 rounded-lg px-2.5 py-1.5">
            <span className="text-red-700 font-medium">ยกเลิก</span>
            <span className="font-bold text-red-800 bg-red-200 px-2 py-0.5 rounded-full text-xs">
              {stat.cancelled}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
