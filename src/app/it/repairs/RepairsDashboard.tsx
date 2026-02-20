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
  PENDING: "รอรับงาน",
  ASSIGNED: "มอบหมายแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  REPAIRING: "กำลังซ่อม",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
  WAITING_PARTS: "รออะไหล่",
};

export function RepairsDashboard() {
  const router = useRouter();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const itemsPerPage = 10;

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
    inProgress: repairs.filter((r) => r.status === "IN_PROGRESS").length,
    completed: repairs.filter((r) => r.status === "COMPLETED").length,
    cancelled: repairs.filter((r) => r.status === "CANCELLED").length,
  };

  /* ---------------- Filtering Logic ---------------- */
  const filteredRepairs = repairs.filter((item) => {
    const matchesSearch =
      item.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.problemTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reporterName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ? true : item.status === filterStatus;

    const matchesPriority =
      filterPriority === "all" || item.urgency === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const totalPages = Math.ceil(filteredRepairs.length / itemsPerPage);
  const paginatedRepairs = filteredRepairs.slice(
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
            <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
              ค้นหา
            </button>
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
            <option value="PENDING">รอรับงาน</option>
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
                  สถานะ
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-600">
                  ความเร่งด่วน
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
                    onClick={() => router.push(`/it/repairs/${repair.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-900">
                        {repair.ticketCode}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                        <Clock size={12} />
                        {new Date(repair.createdAt).toLocaleDateString("th-TH")}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-700">
                        {new Date(repair.createdAt).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
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
                          repair.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : repair.status === "IN_PROGRESS"
                              ? "bg-green-100 text-green-700"
                              : repair.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : repair.status === "CANCELLED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[repair.status] || repair.status}
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/it/repairs/${repair.id}`);
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
                className="bg-white rounded-lg p-4 active:bg-gray-50 transition-all cursor-pointer"
                onClick={() => router.push(`/it/repairs/${repair.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono text-gray-500">
                      {repair.ticketCode}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <Clock size={12} />
                      {new Date(repair.createdAt).toLocaleDateString(
                        "th-TH",
                      )}{" "}
                      {new Date(repair.createdAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      repair.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : repair.status === "IN_PROGRESS"
                          ? "bg-green-100 text-green-700"
                          : repair.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : repair.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {statusLabels[repair.status] || repair.status}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {repair.problemTitle}
                </p>
                <p className="text-xs text-gray-500">{repair.location}</p>
                <div className="flex justify-end items-center mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-blue-600 font-medium">
                    ดูรายละเอียด &rarr;
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ===== Pagination ===== */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-gray-700">
              {currentPage}/{totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
