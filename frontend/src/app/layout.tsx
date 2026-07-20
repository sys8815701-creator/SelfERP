import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { Fredoka } from "next/font/google";
import Script from "next/script";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["700"], variable: "--font-logo" });

export const metadata: Metadata = {
  title: "SelfERP - 소상공인 회계 ERP",
  description: "AI 기반 소상공인 자동 장부 및 회계관리 시스템",
};

/* 하이드레이션 전 localStorage를 읽어 플래시를 방지 */
const themeScript = `(function(){var t=localStorage.getItem('bk-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={fredoka.variable}>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
