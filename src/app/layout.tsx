import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";

// PERF: Reduced from 4 weights to 3 — weight 500 is rarely used, saves ~50KB font download
const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["thai", "latin"],
  weight: ["400", "600", "700"],
  display: "swap", // PERF: Prevent FOIT (Flash of Invisible Text)
});

export const metadata: Metadata = {
  title: "TRR IT Support | ระบบแจ้งซ่อมออนไลน์",
  description:
    "ระบบแจ้งซ่อมอุปกรณ์ IT สำหรับพนักงาน TRR - รวดเร็ว สะดวก ติดตามสถานะได้ตลอดเวลา",
  keywords: "IT Support, ระบบแจ้งซ่อม, TRR, Help Desk",
  authors: [{ name: "TRR Internship Team" }],
};

// PERF: viewport moved from metadata (deprecated) to dedicated export
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head />
      <body className={`${sarabun.variable} antialiased`}>{children}</body>
    </html>
  );
}
