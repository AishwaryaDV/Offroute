import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
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
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
        <Toaster
          richColors
          position="top-center"
          toastOptions={{
            style: { background: "#1a2435", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" },
          }}
        />
      </body>
    </html>
  );
}
