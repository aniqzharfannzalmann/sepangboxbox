import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TopNav } from "@/components/ui/TopNav";
import { FooterDark } from "@/components/ui/FooterDark";
import "./globals.css";

// FerrariSans is licensed. Inter 500 is the substitute documented in design.md.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sepang Box Box",
    template: "%s · Sepang Box Box",
  },
  description:
    "Live timing, standings and the full weekend schedule for the 2026 Bahrain Grand Prix in Malaysia at Sepang International Circuit.",
};

export const viewport: Viewport = {
  themeColor: "#181818",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-body">
        <TopNav />
        <main className="flex-1">{children}</main>
        <FooterDark />
      </body>
    </html>
  );
}
