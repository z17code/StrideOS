import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { getRequestLocale } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "StrideOS — 长跑智能教练",
  description: "面向进阶跑者的智能训练驾驶舱",
  applicationName: "StrideOS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "StrideOS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-background text-foreground">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
