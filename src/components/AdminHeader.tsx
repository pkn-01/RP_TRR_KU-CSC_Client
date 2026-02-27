"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

  return (
    <header className="hidden lg:flex sticky top-0 z-30 bg-white h-16 px-6 items-center justify-end border-b border-gray-100 full-w w-full shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/profile"
          className="flex items-center gap-2 hover:bg-gray-50 p-2 px-3 rounded-lg transition-colors group cursor-pointer"
        >
          {adminProfile?.profilePicture || adminProfile?.pictureUrl ? (
            <Image
              src={
                adminProfile?.profilePicture || adminProfile?.pictureUrl || ""
              }
              alt={adminProfile?.name || "Admin"}
              width={32}
              height={32}
              className="w-7 h-7 rounded-full object-cover border border-gray-200 group-hover:border-gray-400 transition-colors"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-500 flex items-center justify-center group-hover:bg-gray-600 transition-colors shrink-0 text-white">
              <User size={16} />
            </div>
          )}
          <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
            {adminProfile?.email || "admin@example.com"}
          </span>
          <ChevronDown
            size={14}
            className="text-gray-400 ml-1 group-hover:text-gray-600"
          />
        </Link>
      </div>
    </header>
  );
}
