import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import I18n from "@/components/I18n";
import TelegramBridge from "@/components/TelegramBridge";
import { AuthProvider } from "@/lib/auth";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700", "800"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: "italic" });

export const metadata: Metadata = {
  title: "UniHelper — поступление за рубеж по плану",
  description:
    "Портфолио, честная оценка, подбор программ и грантов, моки SAT и IELTS и дорожная карта — в одном месте.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2F62E8" };

// До первой отрисовки: тема (без вспышки светлой), флаги «есть сессия» / «демо» (по ним CSS
// прячет экран входа, пока кабинет загружается у вошедших) и язык: для uz/en страница скрыта,
// пока словарь не применён (не дольше 3 с — потом показываем как есть).
const HEAD_SCRIPT = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('uh-theme');d.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){d.dataset.theme='light'}try{for(var i=0;i<localStorage.length;i++){if(/^sb-.+-auth-token$/.test(localStorage.key(i)||'')){d.dataset.auth='1';break}}var s=JSON.parse(localStorage.getItem('unihelper:v1')||'{}');if(s.demo&&s.demo.active)d.dataset.demo='1';var l=localStorage.getItem('uh-lang');if(l==='uz'||l==='en'){d.lang=l;d.dataset.lang=l;setTimeout(function(){d.dataset.tr='1'},3000)}}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body className={`${manrope.variable} ${instrument.variable} antialiased`}>
        <div className="amb" aria-hidden="true" />
        <AuthProvider>
          {children}
          <TelegramBridge />
          <I18n />
          <Analytics />
        </AuthProvider>
      </body>
    </html>
  );
}
