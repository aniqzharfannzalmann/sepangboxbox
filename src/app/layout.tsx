import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TopNav } from "@/components/ui/TopNav";
import { NavigationProgressBar } from "@/components/ui/NavigationProgressBar";
import { FooterDark } from "@/components/ui/FooterDark";
import { LowDataToggle } from "@/components/preferences/LowDataToggle";
import "./globals.css";

// FerrariSans is licensed. Inter 500 is the substitute documented in design.md.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  // Measured: the variable font and these four static weights both transfer
  // 47.6 KB, so the explicit list stays — it documents what the type scale
  // actually uses.
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/**
 * Where relative metadata URLs resolve from.
 *
 * `og:image` has to be absolute for a crawler to fetch it, and without a base
 * Next both warns and emits a localhost URL — so a shared link would preview
 * as nothing. Vercel supplies VERCEL_URL on every deployment; the fallback is
 * only for local work, where nothing is crawling anyway.
 */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Sepang Box Box",
    template: "%s · Sepang Box Box",
  },
  description:
    "Weather, schedule, standings and nineteen years of history for the 2026 Bahrain Grand Prix in Malaysia at Sepang International Circuit.",
};

export const viewport: Viewport = {
  themeColor: "#181818",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-body">
        <NavigationProgressBar />
        <TopNav />
        <main className="flex-1">{children}</main>
        <FooterDark />
        <div className="fixed bottom-xs right-xs z-40 bg-canvas border border-hairline px-xs py-xxs">
          <LowDataToggle />
        </div>
      </body>
    </html>
  );
}
