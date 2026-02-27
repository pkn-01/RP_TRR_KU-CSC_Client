"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "../../../../services/api";
import { ChevronRight, Calendar, ArrowUpRight } from "lucide-react";
import CalendarPop from "../../../components/CalendarPop";
import Loading from "@/components/Loading";

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
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:p-4 md:p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            {"\u0E41\u0E14\u0E0A\u0E1A\u0E2D\u0E23\u0E4C\u0E14"}
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
                    ? "\u0E23\u0E32\u0E22\u0E27\u0E31\u0E19"
                    : f === "week"
                      ? "\u0E23\u0E32\u0E22\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C"
                      : "\u0E23\u0E32\u0E22\u0E40\u0E14\u0E37\u0E2D\u0E19"}
                </button>
              ))}
            </div>

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
            />
          </div>
        </div>

        {/* Main Stats Cards Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <MainStatItem
            label={
              "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"
            }
            value={stats?.all.total || 0}
          />
          <MainStatItem
            label={
              "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
            }
            value={stats?.all.inProgress || 0}
          />
          <MainStatItem
            label={"\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19"}
            value={stats?.all.completed || 0}
          />
          <MainStatItem
            label={"\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"}
            value={stats?.all.cancelled || 0}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <TodayStatCard
            label={`\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21(${filter === "day" ? "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : filter === "week" ? "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49" : "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49"})`}
            value={stats?.filtered.total || 0}
            link={`/admin/repairs?filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23(${filter === "day" ? "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : filter === "week" ? "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49" : "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49"})`}
            value={stats?.filtered.inProgress || 0}
            link={`/admin/repairs?status=IN_PROGRESS&filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19(${filter === "day" ? "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : filter === "week" ? "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49" : "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49"})`}
            value={stats?.filtered.completed || 0}
            link={`/admin/repairs?status=COMPLETED&filter=${filter}&date=${selectedDate}`}
          />
          <TodayStatCard
            label={`\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01(${filter === "day" ? "\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49" : filter === "week" ? "\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E19\u0E35\u0E49" : "\u0E40\u0E14\u0E37\u0E2D\u0E19\u0E19\u0E35\u0E49"})`}
            value={stats?.filtered.cancelled || 0}
            link={`/admin/repairs?status=CANCELLED&filter=${filter}&date=${selectedDate}`}
          />
        </div>

        {/* Repairs Table (Desktop) & Cards (Mobile) */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {
                "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14"
              }
            </h2>
            <Link
              href="/admin/repairs"
              className="text-sm font-medium text-blue-600 hover:text-brown-800 transition-colors"
            >
              {"\u0E14\u0E39\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14"}
            </Link>
          </div>

          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E23\u0E2B\u0E31\u0E2A"}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E40\u0E27\u0E25\u0E32"}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E1B\u0E31\u0E0D\u0E2B\u0E32"}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E2A\u0E16\u0E32\u0E19\u0E17\u0E35\u0E48"}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {
                      "\u0E04\u0E27\u0E32\u0E21\u0E40\u0E23\u0E48\u0E07\u0E14\u0E48\u0E27\u0E19"
                    }
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E2A\u0E16\u0E32\u0E19\u0E30"}
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">
                    {"\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23"}
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
                          {
                            "\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
                          }
                        </span>
                      )}
                      {repair.status === "IN_PROGRESS" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                          {
                            "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
                          }
                        </span>
                      )}
                      {repair.status === "COMPLETED" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                          {
                            "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19"
                          }
                        </span>
                      )}
                      {repair.status === "CANCELLED" && (
                        <span className="px-2 py-1 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full">
                          {"\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"}
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
                      {
                        "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"
                      }
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
                          {
                            "\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
                          }
                        </span>
                      )}
                      {repair.status === "IN_PROGRESS" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full">
                          {
                            "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
                          }
                        </span>
                      )}
                      {repair.status === "COMPLETED" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-full">
                          {
                            "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19"
                          }
                        </span>
                      )}
                      {repair.status === "CANCELLED" && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700 rounded-full">
                          {"\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"}
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
                {
                  "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"
                }
              </div>
            )}
          </div>
        </div>

        {/* Department Statistics */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
            {
              "\u0E08\u0E33\u0E19\u0E27\u0E19\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E0B\u0E48\u0E2D\u0E21\u0E02\u0E2D\u0E07\u0E41\u0E15\u0E48\u0E25\u0E30\u0E41\u0E1C\u0E19\u0E01"
            }
            <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
              (
              {filter === "day"
                ? `\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${formatDisplayDate(selectedDate)}`
                : filter === "week"
                  ? `\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E02\u0E2D\u0E07 ${formatDisplayDate(selectedDate)}`
                  : `\u0E40\u0E14\u0E37\u0E2D\u0E19 ${new Date(selectedDate).toLocaleDateString("th-TH", { month: "long", year: "numeric" })}`}
              )
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
            {departmentStats.length > 0 ? (
              departmentStats.map((dept) => (
                <DepartmentCard key={dept.department} stat={dept} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                {
                  "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01"
                }
              </div>
            )}
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
    "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E48\u0E2D\u0E21\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14":
      "bg-blue-600 text-white",
    "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23":
      "bg-amber-500 text-white",
    "\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19":
      "bg-emerald-600 text-white",
    "\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01": "bg-rose-600 text-white",
  };

  const colorClass = colorMap[label] || "bg-blue-600 text-white";

  return (
    <div
      className={`flex flex-col items-center justify-center p-3 sm:p-5 min-w-0 w-full rounded-xl shadow-md transition-all hover:scale-[1.05] hover:shadow-xl ${colorClass}`}
    >
      <span className="text-[10px] sm:text-sm mb-1 text-center font-bold uppercase tracking-wider leading-tight">
        {label}
      </span>
      <span className="text-2xl sm:text-4xl font-black">{value}</span>
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

  if (
    label.includes(
      "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23",
    )
  )
    colorClass = "bg-amber-500 text-white";
  if (label.includes("\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19"))
    colorClass = "bg-emerald-600 text-white";
  if (label.includes("\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01"))
    colorClass = "bg-rose-600 text-white";

  return (
    <Link
      href={link}
      className={`relative border-0 p-3 sm:p-5 rounded-xl shadow-md hover:shadow-xl hover:scale-[1.05] transition-all group flex flex-col items-center justify-center min-h-[90px] sm:min-h-[110px] min-w-0 w-full ${colorClass}`}
    >
      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1 sm:p-1.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors">
        <ArrowUpRight className="text-white w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
      </div>

      <span className="text-[10px] sm:text-sm mb-1 font-bold text-center leading-tight uppercase tracking-wide">
        {label}
      </span>
      <span className="text-2xl sm:text-4xl font-black">{value}</span>
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
          <span>
            {
              "\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 :"
            }
          </span>
          <span>{stat.pending}</span>
        </div>
        <div className="flex justify-between font-bold text-amber-600 border-r-4 border-amber-500 pr-2 bg-amber-50 py-1.5 rounded-l">
          <span>
            {
              "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 :"
            }
          </span>
          <span>{stat.inProgress}</span>
        </div>
        <div className="flex justify-between font-bold text-emerald-600 border-r-4 border-emerald-500 pr-2 bg-emerald-50 py-1.5 rounded-l">
          <span>
            {"\u0E40\u0E2A\u0E23\u0E47\u0E08\u0E2A\u0E34\u0E49\u0E19 :"}
          </span>
          <span>{stat.completed}</span>
        </div>
        <div className="flex justify-between font-bold text-rose-600 border-r-4 border-rose-500 pr-2 bg-rose-50 py-1.5 rounded-l">
          <span>{"\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01 :"}</span>
          <span>{stat.cancelled}</span>
        </div>
      </div>
    </div>
  );
}
