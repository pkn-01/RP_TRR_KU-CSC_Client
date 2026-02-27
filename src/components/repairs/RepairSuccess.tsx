"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, Plus } from "lucide-react";
import Swal from "sweetalert2";

interface RepairSuccessProps {
  ticketCode: string;
  linkingCode?: string;
  hasLineUserId?: boolean;
  onNewRequest: () => void;
}

/**
 * Success page displayed after a repair ticket is submitted successfully.
 */
export default function RepairSuccess({
  ticketCode,
  onNewRequest,
}: RepairSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top Decorative Header */}
        <div className="bg-emerald-500 h-32 flex items-end justify-center relative overflow-hidden">
          {/* Decorative Circles */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-4 -left-10 w-24 h-24 bg-black/5 rounded-full blur-xl"></div>

          <div className="translate-y-1/2 p-2 bg-white rounded-full">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-12 pb-8 px-6 sm:px-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            บันทึกข้อมูลสำเร็จ
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            เราได้รับข้อมูลการแจ้งซ่อมของคุณเรียบร้อยแล้ว
            <br />
            ทีมงานจะดำเนินการตรวจสอบโดยเร็วที่สุด
          </p>

          {/* Ticket Info Card */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              รหัสแจ้งซ่อมของคุณ
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl font-mono font-bold text-[#5D3A29] tracking-widest">
                {ticketCode}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 text-gray-400 hover:text-[#5D3A29] hover:bg-white rounded-lg transition-colors border border-transparent shadow-sm hover:border-gray-200"
                title="คัดลอกรหัส"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            {copied && (
              <p className="text-xs text-emerald-600 mt-2 font-medium animate-in fade-in">
                คัดลอกรหัสเรียบร้อยแล้ว!
              </p>
            )}
          </div>

          {/* Action Area */}
          <div className="space-y-4">
            <button
              onClick={onNewRequest}
              className="w-full py-3.5 bg-[#5D3A29] hover:bg-[#4A2E21] text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              แจ้งซ่อมรายการใหม่
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
