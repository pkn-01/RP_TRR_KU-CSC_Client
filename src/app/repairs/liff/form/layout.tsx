import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TRR IT Support | ระบบแจ้งซ่อมออนไลน์",
  description:
    "ระบบแจ้งซ่อมอุปกรณ์ IT สำหรับพนักงาน TRR - รวดเร็ว สะดวก ติดตามสถานะได้ตลอดเวลา",
  openGraph: {
    title: "TRR IT Support | ระบบแจ้งซ่อมออนไลน์",
    description:
      "ระบบแจ้งซ่อมอุปกรณ์ IT สำหรับพนักงาน TRR - รวดเร็ว สะดวก ติดตามสถานะได้ตลอดเวลา",
    type: "website",
  },
};

export default function RepairFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
