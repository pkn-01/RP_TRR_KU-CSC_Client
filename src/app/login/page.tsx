import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirect to the repair form or liff main page
  redirect("/repairs/liff/form");
}
