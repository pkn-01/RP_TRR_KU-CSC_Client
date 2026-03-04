"use client";

import { ProtectedRoute } from "@/hooks/useAuth";
import ITSidebar from "@/components/ITSidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";

function ITLayoutContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ITSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 lg:pt-0 pt-16 min-h-screen ${
          isCollapsed ? "lg:ml-20" : "lg:ml-56"
        }`}
      >
        <main className="flex-1 w-full overflow-x-hidden">
          <div className="lg:p-8 p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default function ITLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedRoute requireIT>
      <SidebarProvider>
        <ITLayoutContent>{children}</ITLayoutContent>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
