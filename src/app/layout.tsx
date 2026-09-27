import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading Prep",
  description: "SPY/QQQ morning trade prep — supply/demand, LVNs, trend, VIX regime",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070b16] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
