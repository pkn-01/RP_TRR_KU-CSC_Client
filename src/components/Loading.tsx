"use client";

import React from "react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({
  message = "กำลังโหลด กรุณารอสักครู่...",
  fullScreen = false,
}: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Donut Spinner */}
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
      {message && (
        <p className="text-gray-500 text-sm font-medium tracking-wide">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {content}
    </div>
  );
}
