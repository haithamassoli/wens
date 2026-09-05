import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2, IBM_Plex_Sans_Arabic } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const baloo = Baloo_Bhaijaan_2({
  variable: "--font-baloo",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800"],
});

const plex = IBM_Plex_Sans_Arabic({
  variable: "--font-plex",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "ونس", template: "%s · ونس" },
  description: "ألعاب وأنشطة قصيرة للزوجين، على هاتف واحد وبلا تسجيل.",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ونس" },
};

export const viewport: Viewport = {
  themeColor: "#f3eef7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${baloo.variable} ${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
