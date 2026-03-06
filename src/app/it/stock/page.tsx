// ===== สต็อกฝ่าย IT | IT Stock =====
import StockClient from "./StockClient";

export const metadata = {
  title: "เช็คสต๊อก | IT-TRR",
  description: "ระบบเช็คสต๊อกและบันทึกจำนวนของแผนก IT",
};

export default function StockPage() {
  return <StockClient />;
}
