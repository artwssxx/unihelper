import Link from "next/link";
import * as I from "@/components/icons";

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-[720px] items-center justify-between px-4 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <I.Logo />
          <span className="text-lg font-extrabold">UniHelper</span>
        </Link>
        <Link href="/login" className="text-sm font-bold text-muted">У меня уже есть аккаунт</Link>
      </header>
      <main className="mx-auto max-w-[720px] px-4 pb-16">{children}</main>
    </div>
  );
}
