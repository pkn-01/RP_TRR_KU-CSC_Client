"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Clock } from "lucide-react";
import { apiFetch } from "@/services/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

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
  assignees?: {
    id: number;
    name: string;
  }[];
}

const statusLabels: Record<string, string> = {
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export function RepairsDashboard() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Get current user ID on mount
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) setCurrentUserId(parseInt(userId));
  }, []);

  /* ---------------- Fetching ---------------- */
  const fetchRepairs = useCallback(async () => {
    if (currentUserId === null) return;

    try {
      setLoading(true);
      const rawData = await apiFetch("/api/repairs");
      const mappedData = ((rawData as any[]) || []).map((r) => ({
        ...r,
        assignees:
          r.assignees?.map((a: any) => ({
            id: a.user?.id || a.userId,
            name: a.user?.name || "Unknown",
          })) || [],
      }));

      // Only show repairs assigned to the current IT user
      const myRepairs = mappedData.filter((r) =>
        r.assignees?.some((a: any) => a.id === currentUserId),
      );

      setRepairs(myRepairs);
    } catch (err) {
      console.error("Error fetching repairs:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchRepairs();
    const interval = setInterval(() => fetchRepairs(), 30000);
    return () => clearInterval(interval);
  }, [fetchRepairs]);

  /* ---------------- Stats ---------------- */
  const stats = {
    total: repairs.length,
    inProgress: repairs.filter(
      (r) => r.status === "IN_PROGRESS" || r.status === "REPAIRING",
    ).length,
    completed: repairs.filter((r) => r.status === "COMPLETED").length,
    cancelled: repairs.filter((r) => r.status === "CANCELLED").length,
  };

  /* ---------------- Filtering Logic ---------------- */
  const filteredRepairs = repairs.filter((item) => {
    const matchesSearch =
      item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.problemTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reporterName?.toLowerCase().includes(searchTerm.toLowerCase());

    // Group PENDING and ASSIGNED together as "รอดำเนินการ"
    let matchesStatus = true;
    if (filterStatus !== "all") {
      matchesStatus = item.status === filterStatus;
    }

    const matchesPriority =
      filterPriority === "all" || item.urgency === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort repairs: newest first
  const sortedRepairs = [...filteredRepairs].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPages = Math.ceil(sortedRepairs.length / itemsPerPage);
  const paginatedRepairs = sortedRepairs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  /* ---------------- Export ---------------- */
  const handleExportExcel = () => {
    if (filteredRepairs.length === 0) {
      Swal.fire({
        title: "ไม่มีข้อมูล",
        text: "ไม่มีข้อมูลสำหรับส่งออก",
        icon: "info",
      });
      return;
    }

    const exportData = filteredRepairs.map((repair) => ({
      เลขใบงาน: repair.ticketCode,
      วันที่แจ้ง: new Date(repair.createdAt).toLocaleDateString("th-TH"),
      เวลาที่แจ้ง: new Date(repair.createdAt).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ปัญหา: repair.problemTitle,
      สถานที่: repair.location,
      ความสำคัญ:
        repair.urgency === "CRITICAL"
          ? "ด่วนมาก"
          : repair.urgency === "URGENT"
            ? "ด่วน"
            : "ปกติ",
      สถานะ: statusLabels[repair.status] || repair.status,
      ผู้รับผิดชอบ: repair.assignees?.map((a) => a.name).join(", ") || "-",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Repairs");
    XLSX.writeFile(
      wb,
      `Repairs_Export_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-[calc(100vh-4rem)] lg:min-h-screen bg-gray-100 p-4 lg:p-6 font-sans overflow-x-hidden">
      <div className="w-full max-w-[1400px] mx-auto space-y-5">
        {/* ===== Stat Cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* รายการทั้งหมด */}
          <div className="rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] shadow-md bg-blue-600 text-white">
            <span className="text-sm font-bold mb-1">รายการทั้งหมด</span>
            <span className="text-3xl font-bold">{stats.total}</span>
          </div>
          {/* กำลังดำเนินการ */}
          <div className="rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] shadow-md bg-amber-500 text-white">
            <span className="text-sm font-bold mb-1">กำลังดำเนินการ</span>
            <span className="text-3xl font-bold">{stats.inProgress}</span>
          </div>
          {/* เสร็จสิ้น */}
          <div className="rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] shadow-md bg-emerald-600 text-white">
            <span className="text-sm font-bold mb-1">เสร็จสิ้น</span>
            <span className="text-3xl font-bold">{stats.completed}</span>
          </div>
          {/* ยกเลิก */}
          <div className="rounded-xl p-4 flex flex-col items-center justify-center min-h-[90px] shadow-md bg-rose-600 text-white">
            <span className="text-sm font-bold mb-1">ยกเลิก</span>
            <span className="text-3xl font-bold">{stats.cancelled}</span>
          </div>
        </div>

        {/* ===== Filters ===== */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้แจ้ง/เลขรหัส"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-4 pr-16 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

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

        {/* ===== Desktop Table ===== */}
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
              {loading && repairs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    กำลังโหลด...
                  </td>
                </tr>
              ) : paginatedRepairs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                paginatedRepairs.map((repair) => (
                  <tr
                    key={repair.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      router.push(`/it/repairs/${repair.ticketCode}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900">
                        {repair.ticketCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {new Date(repair.createdAt).toLocaleDateString(
                          "th-TH",
                          {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          },
                        )}{" "}
                        {new Date(repair.createdAt).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
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
                                  : repair.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {statusLabels[repair.status] || repair.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/it/repairs/${repair.ticketCode}`);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ===== Mobile Cards ===== */}
        <div className="md:hidden space-y-3">
          {loading && repairs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
          ) : paginatedRepairs.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-400">
              ไม่พบรายการ
            </div>
          ) : (
            paginatedRepairs.map((repair) => (
              <div
                key={repair.id}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-all cursor-pointer"
                onClick={() => router.push(`/it/repairs/${repair.ticketCode}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-mono text-gray-500">
                      {repair.ticketCode}
                    </span>
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
                        {repair.urgency === "CRITICAL"
                          ? "ด่วนมาก"
                          : repair.urgency === "URGENT"
                            ? "ด่วน"
                            : "ปกติ"}
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
                                  : repair.status === "CANCELLED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {statusLabels[repair.status] || repair.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1 leading-snug">
                  {repair.problemTitle}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{repair.location}</span>
                  <span>•</span>
                  <span>
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
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===== Pagination ===== */}
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
