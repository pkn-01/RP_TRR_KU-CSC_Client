"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../services/api";
import { ChevronRight, Calendar } from "lucide-react";

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
    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch dashboard statistics with filter
        const dashboardStats = await apiFetch(
          `/api/repairs/statistics/dashboard?filter=${filter}&date=${selectedDate}`,
          "GET",
        );

        // Fetch department statistics
        const deptStats = await apiFetch(
          "/api/repairs/statistics/by-department",
          "GET",
        );

        setStats(dashboardStats);
        setDepartmentStats(Array.isArray(deptStats) ? deptStats : []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">แดชบอร์ด</h1>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <div className="flex bg-white border border-gray-200 rounded-full overflow-hidden">
              {(["day", "week", "month"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    filter === f
                      ? "bg-[#5D1F1F] text-white rounded-full shadow-md"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
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
              <span className="text-sm text-gray-600">
                {formatDisplayDate(selectedDate)}
              </span>
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="รายการซ่อมทั้งหมด" value={stats?.all.total || 0} />
          <StatCard label="กำลังดำเนินการ" value={stats?.all.inProgress || 0} />
          <StatCard label="ปิดงาน" value={stats?.all.completed || 0} />
          <StatCard label="ยกเลิก" value={stats?.all.cancelled || 0} />
        </div>

        {/* Today Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TodayStatCard
            label={`รายการซ่อม(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.total || 0}
            link="/admin/repairs"
          />
          <TodayStatCard
            label={`กำลังดำเนินการ(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.inProgress || 0}
            link="/admin/repairs?status=IN_PROGRESS"
          />
          <TodayStatCard
            label={`ปิดงาน(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.completed || 0}
            link="/admin/repairs?status=COMPLETED"
          />
          <TodayStatCard
            label={`ยกเลิก(${filter === "day" ? "วันนี้" : filter === "week" ? "สัปดาห์นี้" : "เดือนนี้"})`}
            value={stats?.filtered.cancelled || 0}
            link="/admin/repairs?status=CANCELLED"
          />
        </div>

        {/* Repairs Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
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
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentRepairs.slice(0, 7).map((repair, index) => (
                  <tr
                    key={repair.id}
                    className={`hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">
                      {repair.ticketCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {formatDate(repair.createdAt)}{" "}
                      {formatTime(repair.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {repair.problemTitle.length > 30
                        ? repair.problemTitle.substring(0, 30) + "..."
                        : repair.problemTitle}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-400">
                      {repair.location}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`${
                          repair.urgency === "CRITICAL" ||
                          repair.urgency === "URGENT"
                            ? "text-red-500"
                            : "text-blue-400"
                        }`}
                      >
                        {getUrgencyLabel(repair.urgency)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/repairs/${repair.id}`}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            จำนวนรายการแจ้งซ่อมของแต่ละแผนก
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {departmentStats.map((dept) => (
              <DepartmentCard key={dept.department} stat={dept} />
            ))}
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
  return (
    <Link
      href={link}
      className="bg-white border border-gray-200 p-4 rounded-lg hover:border-[#5D1F1F] transition-colors group"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <ChevronRight
          size={16}
          className="text-gray-300 group-hover:text-[#5D1F1F] transition-colors"
        />
      </div>
      <div className="mt-2">
        <span className="text-4xl font-bold text-gray-900">{value}</span>
      </div>
    </Link>
  );
}

// Department Card Component
function DepartmentCard({ stat }: { stat: DepartmentStat }) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg">
      <div className="text-center mb-3">
        <span className="text-sm font-medium text-gray-700">
          {stat.department}
        </span>
      </div>
      <div className="text-center mb-4">
        <span className="text-4xl font-bold text-gray-900">{stat.total}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600 border-r-4 border-yellow-400 pr-2">
          <span>รอดำเนินการ :</span>
          <span>{stat.pending}</span>
        </div>
        <div className="flex justify-between text-gray-600 border-r-4 border-blue-400 pr-2">
          <span>กำลังดำเนินการ :</span>
          <span>{stat.inProgress}</span>
        </div>
        <div className="flex justify-between text-gray-600 border-r-4 border-green-400 pr-2">
          <span>ปิดงาน :</span>
          <span>{stat.completed}</span>
        </div>
        <div className="flex justify-between text-gray-600 border-r-4 border-red-400 pr-2">
          <span>ยกเลิก :</span>
          <span>{stat.cancelled}</span>
        </div>
      </div>
    </div>
  );
}
