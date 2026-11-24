import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "UniHelper — поступление за рубеж по плану",
  description:
    "Unihelper собирает портфолио, честно показывает, каким программам и грантам ты подходишь, и ведёт по дорожной карте до отправки заявки.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2E6BE6" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} antialiased`}>{children}</body>
    </html>
  );
}
