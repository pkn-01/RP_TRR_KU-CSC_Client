import { redirect } from "next/navigation";

// This page simply redirects to the form page.
// LIFF initialization is handled entirely by /repairs/liff/form/page.tsx
// to avoid duplicate LIFF init causing infinite redirect loops.
export default function RepairLiffPage() {
  redirect("/repairs/liff/form");
}
