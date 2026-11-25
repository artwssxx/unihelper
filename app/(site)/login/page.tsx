import LoginCard from "@/components/auth/LoginCard";
import LangSwitch from "@/components/LangSwitch";

export const metadata = { title: "UniHelper — вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10">
      <LangSwitch />
      <LoginCard next={safe} />
    </div>
  );
}
