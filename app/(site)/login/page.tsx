import LoginCard from "@/components/auth/LoginCard";

export const metadata = { title: "UniHelper — вход" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <LoginCard next={safe} />
    </div>
  );
}
