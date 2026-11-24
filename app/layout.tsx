import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: "italic" });

export const metadata: Metadata = {
  title: "UniHelper — поступление за рубеж по плану",
  description:
    "Портфолио, честная оценка, подбор программ и грантов, моки SAT и IELTS и дорожная карта — в одном месте.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2F62E8" };

// Тема ставится до первой отрисовки, чтобы не было вспышки светлой темы.
const THEME_SCRIPT = `try{var t=localStorage.getItem('uh-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${manrope.variable} ${instrument.variable} antialiased`}>
        <div className="amb" aria-hidden="true"><i /><i /><i /></div>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
