import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getRequestLocale();
  const themeBootScript = `(function(){try{var k='strideos_theme';var v=localStorage.getItem(k);var d=v==='dark'||(v!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';var a=localStorage.getItem('strideos_accent');var ok={zinc:1,emerald:1,sky:1,amber:1,rose:1,violet:1,orange:1};r.dataset.accent=ok[a]?a:'emerald';var s=localStorage.getItem('strideos_style');r.dataset.style=(s==='classic'||s==='apple')?s:'apple';var sb=localStorage.getItem('strideos_sidebar_collapsed');r.dataset.sidebar=sb==='1'?'collapsed':'expanded';var c=d?'#09090b':'#f4f4f5';var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m);}m.setAttribute('content',c);}catch(e){}})();`;

  return (
    <html lang={locale} suppressHydrationWarning data-accent="emerald" data-style="apple" data-sidebar="expanded">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground">
        <ThemeProvider>
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
