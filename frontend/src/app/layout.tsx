import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { MobileOnly } from "@/components/MobileOnly";
import { ServiceWorkerRegistration } from "@/components/ServiceWorker";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Offroute",
  description:
    "Log travel as circuits — ordered, shareable routes of personally curated points.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Offroute",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <head>
        <meta name="theme-color" content="#0b1120" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0b1120] text-white">
        <Providers><MobileOnly>{children}</MobileOnly></Providers>
        <ServiceWorkerRegistration />
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: "#fff",
              color: "#0f1d32",
              border: "1px solid #e5e7eb",
            },
            classNames: {
              error: "!border-red-400 !bg-red-50 !text-red-700",
              success: "!border-emerald-400 !bg-emerald-50 !text-emerald-700",
            },
          }}
        />
      </body>
    </html>
  );
}
