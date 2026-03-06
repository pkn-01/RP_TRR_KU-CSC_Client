"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
import {
  Search,
  Filter,
  ChevronRight,
  Clock,
  MapPin,
  AlertTriangle,
} from "lucide-react";

export const dynamic = "force-dynamic";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://rp-trr-ku-csc-server-smoky.vercel.app";

// Status config
const STATUS_CONFIG: Record<
  string,
  { text: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    text: "รอดำเนินการ",
    color: "#92400E",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  ASSIGNED: {
    text: "มอบหมายแล้ว",
    color: "#1E40AF",
    bg: "#DBEAFE",
    border: "#93C5FD",
  },
  IN_PROGRESS: {
    text: "กำลังดำเนินการ",
    color: "#B45309",
    bg: "#FFF7ED",
    border: "#FDBA74",
  },
  WAITING_PARTS: {
    text: "รออะไหล่",
    color: "#6D28D9",
    bg: "#EDE9FE",
    border: "#C4B5FD",
  },
  COMPLETED: {
    text: "เสร็จสิ้น",
    color: "#065F46",
    bg: "#D1FAE5",
    border: "#6EE7B7",
  },
  CANCELLED: {
    text: "ยกเลิก",
    color: "#991B1B",
    bg: "#FEE2E2",
    border: "#FCA5A5",
  },
};

const URGENCY_CONFIG: Record<
  string,
  { text: string; color: string; bg: string }
> = {
  NORMAL: { text: "ปกติ", color: "#6B7280", bg: "#F3F4F6" },
  URGENT: { text: "ด่วน", color: "#D97706", bg: "#FEF3C7" },
  CRITICAL: { text: "ด่วนมาก", color: "#DC2626", bg: "#FEE2E2" },
};

// Filter tabs
const FILTER_TABS = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอดำเนินการ" },
  { key: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { key: "COMPLETED", label: "เสร็จสิ้น" },
  { key: "CANCELLED", label: "ยกเลิก" },
];

interface RepairTicket {
  id: number;
  ticketCode: string;
  reporterName: string;
  reporterDepartment?: string;
  reporterPhone?: string;
  problemTitle: string;
  problemDescription?: string;
  problemCategory: string;
  location: string;
  status: string;
  urgency: string;
  notes?: string;
  messageToReporter?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  attachments?: { id: number; fileUrl: string; filename: string }[];
  assignees?: { user: { name: string } }[];
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateStr));
}

function formatShortDate(dateStr: string) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateStr));
}

function MyTicketsContent() {
  const searchParams = useSearchParams();

  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize LIFF and fetch tickets
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Try to get lineUserId from URL first (if redirected from LIFF page)
        const urlLineUserId = searchParams.get("lineUserId");

        let userId = urlLineUserId || "";

        if (!userId) {
          // Try LIFF SDK
          const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
          if (liffId) {
            try {
              const liff = (await import("@line/liff")).default;

              if (!liff.id) {
                await liff.init({
                  liffId,
                  withLoginOnExternalBrowser: false,
                });
              }

              if (liff.isInClient() || liff.isLoggedIn()) {
                try {
                  const profile = await liff.getProfile();
                  if (profile.userId) {
                    userId = profile.userId;
                  }
                } catch {
                  // Failed to get profile
                }
              } else {
                // Force login - redirect back to my-tickets page after login
                liff.login({
                  redirectUri: window.location.href,
                });
                return;
              }
            } catch {
              // LIFF init failed
            }
          }
        }

        if (!userId) {
          setError("ไม่สามารถระบุตัวตนได้ กรุณาเปิดผ่าน LINE");
          setLoading(false);
          return;
        }

        setLineUserId(userId);

        // Fetch tickets
        const res = await fetch(
          `${API_BASE_URL}/api/repairs/liff/my-tickets?lineUserId=${userId}`,
        );
        if (!res.ok) throw new Error("ไม่สามารถโหลดรายการแจ้งซ่อมได้");
        const data = await res.json();
        setTickets(data);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchParams]);

  // Filtered & searched tickets
  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Filter by status
    if (activeFilter !== "ALL") {
      if (activeFilter === "IN_PROGRESS") {
        result = result.filter((t) =>
          ["ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"].includes(t.status),
        );
      } else {
        result = result.filter((t) => t.status === activeFilter);
      }
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.problemTitle.toLowerCase().includes(q) ||
          (t.location && t.location.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [tickets, activeFilter, searchQuery]);

  // Count per status for badges
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: tickets.length };
    for (const t of tickets) {
      if (["ASSIGNED", "IN_PROGRESS", "WAITING_PARTS"].includes(t.status)) {
        counts["IN_PROGRESS"] = (counts["IN_PROGRESS"] || 0) + 1;
      } else {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
    }
    return counts;
  }, [tickets]);

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#5D3A29] text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold">รายการแจ้งซ่อมของฉัน</h1>
        </div>
      </header>

      {/* Filter & Search Area */}
      <div className="sticky top-[76px] z-20 bg-white shadow-sm border-b border-gray-100">
        {/* Filter Tabs */}
        <div className="max-w-3xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide gap-1 px-4 py-3">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.key;
              const count = statusCounts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#5D3A29] text-white shadow-md"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสงาน หรือปัญหา..."
              className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-0 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29]/30 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            พบ{" "}
            <span className="font-semibold text-gray-800">
              {filteredTickets.length}
            </span>{" "}
            รายการ
          </p>
        </div>

        {/* Ticket List */}
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              ไม่พบรายการ
            </h3>
            <p className="text-sm text-gray-400 text-center">
              {searchQuery
                ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่"
                : "ยังไม่มีรายการแจ้งซ่อมในสถานะนี้"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => {
              const status = STATUS_CONFIG[ticket.status] || {
                text: ticket.status,
                color: "#6B7280",
                bg: "#F3F4F6",
                border: "#E5E7EB",
              };
              const urgency = URGENCY_CONFIG[ticket.urgency] || {
                text: ticket.urgency,
                color: "#6B7280",
                bg: "#F3F4F6",
              };

              return (
                <a
                  key={ticket.id}
                  href={`/repairs/track/${ticket.ticketCode}`}
                  className="block bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden active:scale-[0.98]"
                >
                  {/* Status Bar */}
                  <div
                    className="h-1.5"
                    style={{ backgroundColor: status.color }}
                  />

                  <div className="p-4">
                    {/* Top Row: Code + Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-bold text-gray-500">
                        {ticket.ticketCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ticket.urgency !== "NORMAL" && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: urgency.bg,
                              color: urgency.color,
                            }}
                          >
                            {urgency.text}
                          </span>
                        )}
                        <span
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: status.bg,
                            color: status.color,
                            border: `1px solid ${status.border}`,
                          }}
                        >
                          {status.text}
                        </span>
                      </div>
                    </div>

                    {/* Problem Title */}
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 leading-relaxed">
                      {ticket.problemTitle}
                    </h3>

                    {/* Bottom Row: Meta Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatShortDate(ticket.createdAt)}
                        </span>
                        {ticket.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="max-w-[120px] truncate">
                              {ticket.location}
                            </span>
                          </span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>

                    {/* Assignees */}
                    {ticket.assignees && ticket.assignees.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <span className="text-xs text-gray-400">
                          ผู้รับผิดชอบ:{" "}
                          <span className="text-gray-600 font-medium">
                            {ticket.assignees
                              .map((a) => a.user.name)
                              .join(", ")}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-xs text-gray-400">ระบบแจ้งซ่อมออนไลน์</p>
        </div>
      </main>
    </div>
  );
}

export default function MyTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#5D3A29] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <MyTicketsContent />
    </Suspense>
  );
}
