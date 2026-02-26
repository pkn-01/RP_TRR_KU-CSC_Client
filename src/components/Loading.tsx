"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export default function Loading({ message, fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-6">
      <div className="relative">
        {/* Spinner Background Ring */}
        <div className="w-16 h-16 rounded-full border-4 border-gray-200" />

        {/* Animated Spinner Segment */}
        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-[#5D2E1F] border-t-transparent animate-spin" />

        {/* Center Dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#5D2E1F] rounded-full animate-pulse" />
      </div>

      <div className="flex flex-col items-center gap-3">
        <p className="text-[#5D2E1F] font-bold text-lg animate-pulse tracking-wide">
          {message || "กำลังโหลด กรุณารอสักครู่..."}
        </p>

        {/* Shimmer Bar */}
        <div className="h-1.5 w-32 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50 shadow-inner">
          <div className="h-full bg-gradient-to-r from-transparent via-[#5D2E1F]/60 to-transparent w-full animate-shimmer" />
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-[9999]">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-12 min-h-[300px]">
      {content}
    </div>
  );
}
