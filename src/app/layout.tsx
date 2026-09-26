import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "넥스트레벨 캠프 데이터", template: "%s · 넥스트레벨 캠프 데이터" },
  description: "넥스트레벨 유소년 농구캠프 바이오메카닉스 측정 데이터 — 기준 데이터, 개인 리포트, 변화 추적",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14305e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        <footer className="no-print border-t border-line py-6 text-center text-xs text-muted">
          넥스트레벨 유소년 농구캠프 · 바이오메카닉스 측정 데이터
        </footer>
      </body>
    </html>
  );
}
