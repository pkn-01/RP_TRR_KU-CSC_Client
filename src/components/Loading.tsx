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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center gap-4">
          {spinner}
          {message && (
            <p className="text-white text-sm font-medium tracking-wide">
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
