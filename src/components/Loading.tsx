"use client";

// ===== หน้าจอโหลด | Loading Component =====
import React from "react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({
  message = "กำลังโหลด กรุณารอสักครู่...",
  fullScreen = false,
}: LoadingProps) {
  const spinner = (
    <svg
      className="animate-spin"
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
    >
      {/* Gray track */}
      <circle
        cx="32"
        cy="32"
        r="26"
        stroke="#d1d5db"
        strokeWidth="6"
        fill="none"
      />
      {/* Blue spinning arc */}
      <circle
        cx="32"
        cy="32"
        r="26"
        stroke="#3b82f6"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="120 200"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/95 rounded-2xl shadow-2xl px-8 py-10 mx-6 flex flex-col items-center justify-center gap-5 max-w-sm w-full animate-[fadeIn_0.2s_ease-out]">
          {spinner}
          {message && (
            <p className="text-gray-700 text-sm font-medium text-center leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center justify-center gap-4">
        {spinner}
        {message && (
          <p className="text-gray-500 text-sm font-medium tracking-wide">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
