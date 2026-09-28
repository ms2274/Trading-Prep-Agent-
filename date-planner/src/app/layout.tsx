import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Date Night — NYC",
  description: "Plan the whole night in a minute. Vibe in, itinerary out.",
};

export const viewport: Viewport = {
  themeColor: "#0a0806",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col relative">
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
