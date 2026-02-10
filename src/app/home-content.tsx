"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeContent() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin login
    router.push("/login/admin");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <svg
            className="w-12 h-12 text-blue-600 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4a8 8 0 018 8m0 0a8 8 0 11-16 0 8 8 0 0116 0z"
            />
          </svg>
        </div>
        <p className="text-gray-600">กำลังโหลด...</p>
      </div>
    </div>
  );
}
