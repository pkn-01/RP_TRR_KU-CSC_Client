"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

export const dynamic = "force-dynamic";

function RepairLiffContent() {
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // Check if lineUserId is already provided in URL (from Rich Menu or external link)
        const urlLineUserId = searchParams.get("lineUserId");

        if (urlLineUserId) {
          // Already have lineUserId, redirect to form directly
          window.location.href = `/repairs/liff/form?lineUserId=${urlLineUserId}`;
          return;
        }

        // Try to get lineUserId from LIFF SDK (optional - won't block if fails)
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || "";
        if (!liffId) {
          // No LIFF ID configured, redirect to form as guest
          window.location.href = `/repairs/liff/form`;
          return;
        }

        try {
          const liff = (await import("@line/liff")).default;

          if (!liff.id) {
            const initPromise = liff.init({
              liffId,
              withLoginOnExternalBrowser: false, // Don't force login
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("LIFF initialization timeout")),
                5000,
              ),
            );

            await Promise.race([initPromise, timeoutPromise]);
          }

          // Try to get profile without forcing login
          if (liff.isInClient() || liff.isLoggedIn()) {
            try {
              const profile = await liff.getProfile();
              if (profile.userId) {
                window.location.href = `/repairs/liff/form?lineUserId=${profile.userId}`;
                return;
              }
            } catch {
              // Failed to get profile, continue as guest
            }
          }

          // No login available, redirect to form as guest
          window.location.href = `/repairs/liff/form`;
        } catch {
          // LIFF init failed, redirect to form as guest
          window.location.href = `/repairs/liff/form`;
        }
      } catch (err) {
        console.error("Init Error:", err);
        if (isMounted) {
          window.location.href = `/repairs/liff/form`;
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // Loading Screen while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">กำลังโหลด...</p>
      </div>
    </div>
  );
}

export default function RepairLiffPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">กำลังโหลด...</p>
        </div>
      }
    >
      <RepairLiffContent />
    </Suspense>
  );
}
