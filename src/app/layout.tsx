import type { Metadata } from "next";
import { Kanit, Sarabun } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
});

const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
});

export const metadata: Metadata = {
  title: "ระบบ 3S Party — ชุมนุมสื่อสร้างสรรค์",
  description: "ระบบ 3S Party — ส่งงานและตรวจงานสำหรับชุมนุมสื่อสร้างสรรค์",
};

import { RouteProgressBar } from "@/components/common/RouteProgressBar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${kanit.variable} ${sarabun.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <RouteProgressBar />
        {children}
      </body>
    </html>
  );
}
