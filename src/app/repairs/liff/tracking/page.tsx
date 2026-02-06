"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Search,
  Calendar,
  Wrench,
  AlertTriangle,
  ArrowLeft,
  Ticket,
} from "lucide-react";
import { apiFetch } from "@/services/api";

function TrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get ticket code from URL if available
  const initialTicketCode = searchParams.get("ticketCode") || "";

  const [ticketCode, setTicketCode] = useState(initialTicketCode);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-search if ticket code is in URL
  useEffect(() => {
    if (initialTicketCode) {
      handleSearch();
    }
  }, []);

  const handleSearch = async () => {
    if (!ticketCode.trim()) {
      setError("กรุณาระบุรหัสการแจ้งซ่อม");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await apiFetch(
        `/api/repairs/liff/ticket-public/${ticketCode.trim()}`,
      );
      setTicket(data);
    } catch (err: any) {
      console.error("Failed to fetch ticket:", err);
      if (err.message?.includes("404") || err.message?.includes("not found")) {
        setError("ไม่พบรหัสการแจ้งซ่อมนี้ในระบบ");
      } else {
        setError("ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
      }
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "WAITING_PARTS":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "ASSIGNED":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "เสร็จสิ้น";
      case "IN_PROGRESS":
        return "กำลังดำเนินการ";
      case "WAITING_PARTS":
        return "รออะไหล่";
      case "PENDING":
        return "รอดำเนินการ";
      case "ASSIGNED":
        return "มอบหมายแล้ว";
      case "CANCELLED":
        return "ยกเลิก";
      default:
        return status;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case "CRITICAL":
        return { label: "ด่วนมาก", color: "text-red-600 bg-red-50" };
      case "URGENT":
        return { label: "ด่วน", color: "text-orange-600 bg-orange-50" };
      default:
        return { label: "ปกติ", color: "text-blue-600 bg-blue-50" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      {/* Header Section */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push("/repairs/liff/form")}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">
            ติดตามสถานะแจ้งซ่อม
          </h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 mt-6">
        {/* Search Box */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#5D3A29]/10 rounded-full flex items-center justify-center">
              <Ticket className="w-5 h-5 text-[#5D3A29]" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">
                ค้นหาด้วยรหัสแจ้งซ่อม
              </h2>
              <p className="text-sm text-slate-500">
                กรอกรหัสที่ได้รับหลังจากแจ้งซ่อม
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={ticketCode}
                onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="เช่น REP-1234567890"
                className="w-full pl-12 pr-4 py-3 bg-slate-100 border-0 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5D3A29] font-mono"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-[#5D3A29] hover:bg-[#4A2E21] disabled:bg-slate-300 text-white rounded-xl font-medium transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "ค้นหา"
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-6 rounded-2xl text-center shadow-sm mb-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />
            <h3 className="font-bold text-lg mb-1">ไม่พบข้อมูล</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center py-12">
            <div className="w-12 h-12 border-4 border-[#5D3A29] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600 font-medium">กำลังค้นหา...</p>
          </div>
        )}

        {/* Ticket Result */}
        {ticket && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Status Header */}
            <div
              className={`p-4 ${
                ticket.status === "COMPLETED"
                  ? "bg-green-500"
                  : ticket.status === "IN_PROGRESS"
                    ? "bg-blue-500"
                    : ticket.status === "WAITING_PARTS"
                      ? "bg-orange-500"
                      : ticket.status === "ASSIGNED"
                        ? "bg-purple-500"
                        : ticket.status === "CANCELLED"
                          ? "bg-gray-500"
                          : "bg-yellow-500"
              } text-white`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">สถานะปัจจุบัน</p>
                  <p className="text-xl font-bold">
                    {getStatusLabel(ticket.status)}
                  </p>
                </div>
                {ticket.status === "COMPLETED" ? (
                  <CheckCircle2 className="w-10 h-10 opacity-80" />
                ) : ticket.status === "IN_PROGRESS" ? (
                  <Wrench className="w-10 h-10 opacity-80" />
                ) : (
                  <Clock className="w-10 h-10 opacity-80" />
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="p-5 space-y-4">
              {/* Ticket Code */}
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="text-slate-500 text-sm">รหัสแจ้งซ่อม</span>
                <span className="font-mono font-bold text-slate-800">
                  {ticket.ticketCode}
                </span>
              </div>

              {/* Problem Title */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {ticket.problemTitle}
                </h3>
                {ticket.problemDescription && (
                  <p className="text-slate-600 text-sm">
                    {ticket.problemDescription}
                  </p>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">ผู้แจ้ง</p>
                  <p className="font-medium text-slate-800 text-sm">
                    {ticket.reporterName}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">แผนก</p>
                  <p className="font-medium text-slate-800 text-sm">
                    {ticket.reporterDepartment || "-"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1">สถานที่</p>
                  <p className="font-medium text-slate-800 text-sm">
                    {ticket.location || "-"}
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 ${getUrgencyLabel(ticket.urgency).color}`}
                >
                  <p className="text-xs opacity-70 mb-1">ความเร่งด่วน</p>
                  <p className="font-medium text-sm">
                    {getUrgencyLabel(ticket.urgency).label}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 pt-4 border-t text-sm">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    แจ้งเมื่อ:{" "}
                    {new Date(ticket.createdAt).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Assignees */}
              {ticket.assignees && ticket.assignees.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">ผู้รับผิดชอบ</p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.assignees.map((assignee: any) => (
                      <span
                        key={assignee.user.id}
                        className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                      >
                        {assignee.user.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Message to Reporter */}
              {ticket.messageToReporter && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">
                    ข้อความจากทีมซ่อม
                  </p>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-blue-800 text-sm">
                      {ticket.messageToReporter}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State - Before Search */}
        {!hasSearched && !ticket && !loading && (
          <div className="bg-white border rounded-2xl p-10 text-center shadow-sm">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">
              ติดตามสถานะการแจ้งซ่อม
            </h3>
            <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
              กรอกรหัสการแจ้งซ่อมที่ได้รับหลังจากส่งฟอร์มเพื่อติดตามสถานะ
            </p>
          </div>
        )}
      </div>

      {/* Floating Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
        <button
          onClick={() => router.push("/repairs/liff/form")}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Wrench className="w-5 h-5 text-emerald-400" />
          <span>แจ้งซ่อมใหม่</span>
        </button>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#5D3A29] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
