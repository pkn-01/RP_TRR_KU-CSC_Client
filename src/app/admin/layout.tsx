"use client";

import { Suspense } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import "@/app/globals.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-gray-100 min-h-screen">
      <Suspense fallback={<div className="w-64 bg-white h-screen fixed" />}>
        <AdminSidebar />
      </Suspense>
      <main className="flex-1 lg:ml-56 lg:pt-0 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
