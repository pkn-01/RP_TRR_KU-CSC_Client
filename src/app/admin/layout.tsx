"use client";

import AdminSidebar from "@/components/AdminSidebar";
import "@/app/globals.css";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <AdminSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 lg:pt-0 pt-16 min-h-screen ${
          isCollapsed ? "lg:ml-20" : "lg:ml-56"
        }`}
      >
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}
