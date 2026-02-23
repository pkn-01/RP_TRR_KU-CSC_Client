"use client";

import React from "react";

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
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50/50 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          ส่งเรื่องแจ้งซ่อมสำเร็จ
        </h1>
        <p className="text-slate-500 mb-6">
          ทีมงานจะดำเนินการตรวจสอบโดยเร็วที่สุด
        </p>

        {/* Ticket Code Card */}
        <div>
          <p className="text-sm text-slate-500 mb-2">รหัสการแจ้งซ่อม</p>
          <p className="text-2xl font-mono font-bold text-emerald-600 tracking-wider">
            {ticketCode}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onNewRequest}
            className="w-full py-3 bg-[#5D3A29] hover:bg-[#4A2E21] text-white rounded-xl font-medium transition-all duration-200"
          >
            แจ้งซ่อมรายการใหม่
          </button>
        </div>
      </div>
    </div>
  );
}
