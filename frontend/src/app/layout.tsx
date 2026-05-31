import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { AuthProvider } from "@/components/AuthProvider";
import MainLayout from "@/components/MainLayout";

export const metadata: Metadata = {
  title: "IOCenrich - Advanced Threat Intelligence",
  description: "Advanced threat intelligence extraction, enrichment engine, and IOC lifecycle management.",
  verification: {
    google: "u9U13pe6HQnC9vOFyKMRGTqMZhwyWCONcZSw-tojVUk",
  },
  openGraph: {
    title: "IOCenrich - Threat Intelligence",
    description: "Advanced threat intelligence extraction and enrichment engine.",
    url: "https://iocenrich.netdefend.in",
    siteName: "IOCenrich",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IOCenrich",
    description: "Advanced threat intelligence extraction and enrichment engine.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
