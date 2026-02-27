"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ChevronDown } from "lucide-react";
import { userService, User as UserType } from "@/services/userService";

export default function AdminHeader() {
  const [adminProfile, setAdminProfile] = useState<UserType | null>(null);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (userId) {
          const user = await userService.getUserById(parseInt(userId));
          setAdminProfile(user);
        }
      } catch (error) {
        console.error("Failed to fetch admin profile:", error);
      }
    };
    fetchAdminProfile();
  }, []);

  const router = useRouter();

  const handleLogout = async () => {
    try {
      localStorage.removeItem("userId");
      router.push("/login/admin");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="hidden lg:flex sticky top-0 z-30 bg-white h-16 px-6 items-center justify-between border-b border-gray-100 full-w w-full shadow-sm">
      {/* Left side empty or add branding if needed */}
      <div></div>

      <div className="flex items-center gap-6">
        {/* Profile Info */}
        <div
          className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg transition-colors group cursor-pointer"
          onClick={() => router.push("/admin/profile")}
        >
          {adminProfile?.profilePicture || adminProfile?.pictureUrl ? (
            <Image
              src={
                adminProfile?.profilePicture || adminProfile?.pictureUrl || ""
              }
              alt={adminProfile?.name || "Admin"}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-gray-400 transition-colors"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#ccc] flex items-center justify-center group-hover:bg-[#bbb] transition-colors shrink-0 text-white">
              <User size={20} />
            </div>
          )}

          <div className="flex flex-col items-start">
            <span className="text-sm font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
              {adminProfile?.name || ""}{" "}
              <span className="text-xs font-normal text-gray-600">
                ({adminProfile?.role || ""})
              </span>
            </span>
            <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
              {adminProfile?.email || ""}
            </span>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
          title="ออกจากระบบ"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>
  );
}
