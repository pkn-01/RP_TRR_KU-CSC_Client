"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://rp-trr-ku-csc-server-smoky.vercel.app";

// Status & Urgency configs
const STATUS_CONFIG: Record<
  string,
  { text: string; color: string; bg: string }
> = {
  PENDING: { text: "รอดำเนินการ", color: "#2563EB", bg: "#FEF3C7" },
  IN_PROGRESS: { text: "กำลังดำเนินการ", color: "#D97706", bg: "#FEF3C7" },
  COMPLETED: { text: "เสร็จสิ้น", color: "#059669", bg: "#D1FAE5" },
  CANCELLED: { text: "ยกเลิก", color: "#DC2626", bg: "#FEE2E2" },
};

const URGENCY_CONFIG: Record<
  string,
  { text: string; color: string; bg: string }
> = {
  NORMAL: { text: "ปกติ", color: "#6B7280", bg: "#F3F4F6" },
  URGENT: { text: "ด่วน", color: "#D97706", bg: "#FEF3C7" },
  CRITICAL: { text: "ด่วนที่สุด", color: "#DC2626", bg: "#FEE2E2" },
};

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
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(dateStr));
}

export default function TrackRepairPage() {
  const params = useParams();
  const code = params.code as string;

  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${API_BASE_URL}/api/repairs/liff/ticket-public/${code}`,
        );
        if (!res.ok) throw new Error("ไม่พบรายการแจ้งซ่อม");
        const data = await res.json();
        setTicket(data);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">ไม่พบรายการ</h2>
          <p className="text-slate-500">
            {error || "ไม่พบรายการแจ้งซ่อมที่ต้องการ"}
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS_CONFIG[ticket.status] || {
    text: ticket.status,
    color: "#6B7280",
    bg: "#F3F4F6",
  };
  const urgency = URGENCY_CONFIG[ticket.urgency] || {
    text: ticket.urgency,
    color: "#6B7280",
    bg: "#F3F4F6",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* ── Header Card ── */}
        <div
          className="rounded-2xl p-6 text-white shadow-lg"
          style={{ backgroundColor: status.color }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              สถานะการแจ้งซ่อม
            </span>
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: urgency.bg, color: urgency.color }}
            >
              {urgency.text}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{status.text}</h1>
          <p className="text-white/70 text-sm mt-1">{ticket.ticketCode}</p>
        </div>

        {/* ── Problem Image ── */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <img
              src={ticket.attachments[0].fileUrl}
              alt="รูปภาพปัญหา"
              className="w-full h-52 object-cover"
            />
          </div>
        )}

        {/* ── Ticket Details ── */}
        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          {/* Ticket Code & Date */}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">หมายเลขงาน</span>
            <span className="text-slate-800 font-bold text-sm">
              {ticket.ticketCode}
            </span>
          </div>
          <hr className="border-slate-100" />

          {/* Problem */}
          <div>
            <span className="text-slate-400 text-xs font-bold block mb-1">
              ปัญหาที่แจ้ง
            </span>
            <p className="text-slate-800 font-bold">{ticket.problemTitle}</p>
          </div>

          {/* Description */}
          {ticket.problemDescription &&
            ticket.problemDescription !== ticket.problemTitle && (
              <div className="bg-slate-50 rounded-xl p-4">
                <span className="text-slate-400 text-xs font-bold block mb-1">
                  รายละเอียด
                </span>
                <p className="text-slate-600 text-sm">
                  {ticket.problemDescription}
                </p>
              </div>
            )}

          <hr className="border-slate-100" />

          {/* Info Grid */}
          <div className="space-y-3">
            <InfoRow label="ผู้แจ้ง" value={ticket.reporterName} />
            {ticket.reporterDepartment && (
              <InfoRow label="แผนก" value={ticket.reporterDepartment} />
            )}
            <InfoRow label="สถานที่" value={ticket.location} />
            {ticket.reporterPhone && (
              <InfoRow label="เบอร์โทร" value={ticket.reporterPhone} />
            )}
            <InfoRow label="วันที่แจ้ง" value={formatDate(ticket.createdAt)} />
            {ticket.assignees && ticket.assignees.length > 0 && (
              <InfoRow
                label="ผู้รับผิดชอบ"
                value={ticket.assignees.map((a) => a.user.name).join(", ")}
              />
            )}
            {ticket.completedAt && (
              <InfoRow
                label="เสร็จเมื่อ"
                value={formatDate(ticket.completedAt)}
              />
            )}
            {ticket.cancelledAt && (
              <InfoRow
                label="ยกเลิกเมื่อ"
                value={formatDate(ticket.cancelledAt)}
              />
            )}
          </div>

          {/* Message to Reporter */}
          {ticket.messageToReporter && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
              <span className="text-amber-800 text-xs font-bold block mb-1">
                ข้อความจากเจ้าหน้าที่
              </span>
              <p className="text-amber-900 text-sm">
                {ticket.messageToReporter}
              </p>
            </div>
          )}

          {/* Notes */}
          {/* {ticket.notes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <span className="text-blue-800 text-xs font-bold block mb-1">
                หมายเหตุ
              </span>
              <p className="text-blue-900 text-sm">{ticket.notes}</p>
            </div>
          )} */}
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4">
          <p className="text-slate-400 text-xs">ระบบแจ้งซ่อมออนไลน์</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-slate-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-slate-800 text-sm font-medium text-right ml-4">
        {value}
      </span>
    </div>
  );
}
