"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wrench,
  Users,
  LogOut,
  Menu,
  X,
  User,
  Package,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Calendar,
  List,
  CheckSquare,
  Trash2,
  Database,
} from "lucide-react";
import { userService, User as UserType } from "@/services/userService";

interface SubMenuItem {
  label: string;
  href: string;
}

interface MenuItem {
  icon: React.ComponentType<{
    size: number;
    strokeWidth?: number;
    className?: string;
  }>;
  label: string;
  href?: string;
  subItems?: SubMenuItem[];
}

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [adminProfile, setAdminProfile] = useState<UserType | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  // const [isClearDataOpen, setIsClearDataOpen] = useState(false); // Removed
  const router = useRouter();
  const pathname = usePathname();

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

  // Menu items based on new design
  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "แดชบอร์ด", href: "/admin/dashboard" },
    { icon: Wrench, label: "มอบหมายงาน", href: "/admin/repairs" },
    { icon: Wrench, label: "งานของฉัน", href: "/admin/repairs?filter=mine" },
    { icon: Package, label: "การยืม", href: "/admin/loans" },
    { icon: User, label: "จัดการสมาชิก", href: "/admin/users" },
    {
      icon: Database,
      label: "จัดการข้อมูลระบบ",
      href: "/admin/data-management",
    },
  ];

  const isActive = useCallback(
    (href: string) => {
      if (href.includes("?")) {
        // Handle query params for "My Tasks"
        return (
          pathname === href.split("?")[0] &&
          window.location.search.includes(href.split("?")[1])
        );
      }
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname],
  );

  const toggleMenu = useCallback((label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  }, []);

  useEffect(() => setIsOpen(false), [pathname]);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      localStorage.removeItem("userId");
      router.push("/login/admin");
    } finally {
      setIsLoggingOut(false);
    }
  }, [router]);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#6D4C41] z-50 px-4 flex items-center justify-between shadow-sm">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <span className="font-bold text-white text-lg tracking-wide">
            TRR-RP
          </span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white transition-transform duration-300 z-[60] flex flex-col shadow-xl ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo Header */}
        <div className="h-32 flex items-center justify-center bg-[#6D4C41]">
          <Link href="/admin/dashboard" className="flex items-center">
            <span className="text-3xl font-medium text-white tracking-wider">
              TRR-RP
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-8 space-y-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href!);

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex items-center gap-4 px-2 py-1 transition-colors group`}
              >
                <Icon
                  size={24}
                  strokeWidth={1.5}
                  className={`${
                    active
                      ? "text-gray-900"
                      : "text-gray-900 group-hover:text-gray-600"
                  }`}
                />
                <span
                  className={`text-lg font-normal ${
                    active
                      ? "text-gray-900"
                      : "text-gray-900 group-hover:text-gray-600"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-6">
          <div className="border-t border-gray-300 mb-6" />

          <div className="flex flex-col items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-[#6D4C41] flex items-center justify-center overflow-hidden">
              {adminProfile?.profilePicture || adminProfile?.pictureUrl ? (
                <Image
                  src={
                    adminProfile?.profilePicture ||
                    adminProfile?.pictureUrl ||
                    ""
                  }
                  alt={adminProfile?.name || "Admin"}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-xl font-bold">
                  {(adminProfile?.name || "AD").substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-xl font-medium text-gray-900">
                {adminProfile?.name || "admin"}
              </p>
              <p className="text-sm text-gray-600">
                {adminProfile?.email || "admin@trr.com"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full py-3 rounded-2xl bg-gray-300 text-black hover:bg-gray-400 transition-colors text-lg font-medium"
          >
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}
