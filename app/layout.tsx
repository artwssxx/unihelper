import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "Unihelper — поступление на грант",
  description: "Узнай, насколько ты подходишь программам и грантам, получи план и не пропусти ни одного дедлайна.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} antialiased`}>
        <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Uni<span className="text-accent">helper</span>
          </Link>
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/result" className="hover:text-fg">Мой результат</Link>
            <Link href="/chat" className="hover:text-fg">ИИ-помощник</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
      </body>
    </html>
  );
}
