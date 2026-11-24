import AdminLogin from "@/components/admin/AdminLogin";
import AdminShell from "@/components/admin/AdminShell";
import { adminPassword, isAdmin } from "@/lib/server/adminAuth";

export const metadata = { title: "UniHelper — админка", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) return <AdminLogin configured={Boolean(adminPassword())} />;
  return <AdminShell>{children}</AdminShell>;
}
