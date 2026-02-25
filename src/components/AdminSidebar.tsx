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
  ChevronLeft,
  ChevronRight,
  Settings,
  UserRoundCog,
  ClipboardClock
} from "lucide-react";
import { userService, User as UserType } from "@/services/userService";
import { useSidebar } from "@/context/SidebarContext";

interface SubMenuItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{
    size: number;
    strokeWidth?: number;
    className?: string;
  }>;
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
  const { isCollapsed, toggleSidebar } = useSidebar();
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

  // Menu items with dropdowns based on design
  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: "แดชบอร์ด", href: "/admin/dashboard" },
    { icon: Wrench, label: "รายการซ่อมทั้งหมด", href: "/admin/repairs" },
    // { icon: Wrench, label: "งานของฉัน", href: "/admin/repairs?filter=mine" },
        { icon:ClipboardClock,label: "รายการยืมทั้งหมด", href: "/admin/loans" },
        // { icon:ClipboardList,label: "เช็คสต็อก", href: "/admin/stock" },
    {
      icon: Settings,
      label: "ตั้งค่า",
      subItems: [
        { icon: UserRoundCog, label: "จัดการสมาชิก", href: "/admin/users" },
        { icon: Users, label: "จัดการแผนก", href: "/admin/departments" },
      ],
    },
  ];

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  const isMenuActive = useCallback(
    (item: MenuItem) => {
      if (item.href) {
        return isActive(item.href);
      }
      if (item.subItems) {
        return item.subItems.some((sub) => isActive(sub.href));
      }
      return false;
    },
    [isActive],
  );

  const toggleMenu = useCallback((label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  }, []);

  
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveChild = item.subItems.some((sub) => isActive(sub.href));
        if (hasActiveChild && !expandedMenus.includes(item.label)) {
          setExpandedMenus((prev) => [...prev, item.label]);
        }
      }
    });
  }, [pathname]);

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
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#795548] z-50 px-4 flex items-center justify-between shadow-sm">
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
        className={`fixed left-0 top-0 h-screen bg-white transition-all duration-300 z-[60] flex flex-col border-r border-gray-200 ${
          isOpen ? "translate-x-0 w-56" : "-translate-x-full lg:translate-x-0"
        } ${!isOpen && isCollapsed ? "lg:w-20" : "lg:w-56"}`}
      >
        {/* Logo Header */}
        <div
          className={`h-20 flex items-center bg-[#795548] px-4 transition-all duration-300 ${isCollapsed && !isOpen ? "justify-center" : "justify-between"}`}
        >
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-2 ${isCollapsed && !isOpen ? "hidden" : "flex"}`}
          >
            <span className="text-xl font-bold text-white tracking-wider">
              TRR-RP
            </span>
          </Link>

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleSidebar}
            className={`hidden lg:flex p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors ${
              isCollapsed && !isOpen ? "" : ""
            }`}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus.includes(item.label);
            const active = isMenuActive(item);

            if (hasSubItems) {
              return (
                <div key={item.label}>
                  {/* Parent Menu with Dropdown */}
                  <button
                    onClick={() => toggleMenu(item.label)}
                    title={isCollapsed && !isOpen ? item.label : ""}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                      active
                        ? "text-gray-900"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } ${isCollapsed && !isOpen ? "justify-center" : "justify-between"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={20}
                        strokeWidth={1.5}
                        className={`${active ? "text-[#795548]" : "text-gray-500"}`}
                      />
                      {!isCollapsed || isOpen ? (
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      ) : null}
                    </div>
                    {(!isCollapsed || isOpen) &&
                      (isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                      ))}
                  </button>

                  {/* Submenu Items */}
                  {isExpanded && (
                    <div className="mt-1 ml-8 space-y-1">
                      {item.subItems!.map((subItem) => {
                        const subActive = isActive(subItem.href);
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                              subActive
                                ? "text-gray-900 font-medium"
                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                          >
                            {subItem.icon && (
                              <subItem.icon
                                size={18}
                                strokeWidth={1.5}
                                className={
                                  subActive ? "text-[#795548]" : "text-gray-500"
                                }
                              />
                            )}
                            <span>{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular Menu Item (no submenu)
            return (
              <Link
                key={item.href}
                href={item.href!}
                title={isCollapsed && !isOpen ? item.label : ""}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  active
                    ? "bg-[#795548]/10 text-[#795548] font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                } ${isCollapsed && !isOpen ? "justify-center" : ""}`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.5}
                  className={`${active ? "text-[#795548]" : "text-gray-500"}`}
                />
                {!isCollapsed || isOpen ? (
                  <span className="text-sm">{item.label}</span>
                ) : null}
              </Link>
            );
          })}

          {/* <Link
            href="/admin/data-management"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mt-2 ${
              isActive("/admin/data-management")
                ? "bg-red-50 text-red-700 font-medium"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Database size={20} strokeWidth={1.5} />
            <span className="text-sm">จัดการข้อมูลระบบ</span>
          </Link> */}
        </nav>

        {/* User Profile Section */}
        <div
          className={`p-4 bg-white border-t border-gray-100 ${isCollapsed && !isOpen ? "flex flex-col items-center" : ""}`}
        >
          <Link
            href="/admin/profile"
            title={isCollapsed && !isOpen ? adminProfile?.name || "admin" : ""}
            className={`flex items-center gap-3 mb-4 hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors group ${isCollapsed && !isOpen ? "justify-center" : ""}`}
          >
            {adminProfile?.profilePicture || adminProfile?.pictureUrl ? (
              <Image
                src={
                  adminProfile?.profilePicture || adminProfile?.pictureUrl || ""
                }
                alt={adminProfile?.name || "Admin"}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-[#795548] transition-colors"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#795548] flex items-center justify-center group-hover:bg-[#8d6e63] transition-colors shrink-0">
                <User size={20} className="text-white" />
              </div>
            )}
            {!isCollapsed || isOpen ? (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#795548] transition-colors">
                  {adminProfile?.name || "admin"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {adminProfile?.email || "admin@trr.com"}
                </p>
              </div>
            ) : null}
          </Link>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isCollapsed && !isOpen ? "ออกจากระบบ" : ""}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors text-sm font-medium ${isCollapsed && !isOpen ? "px-0" : ""}`}
          >
            <LogOut
              size={18}
              className={`${isCollapsed && !isOpen ? "" : ""}`}
            />
            {!isCollapsed || isOpen ? <span>ออกจากระบบ</span> : null}
          </button>
        </div>
      </aside>
    </>
  );
}
