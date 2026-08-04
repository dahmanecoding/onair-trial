import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import TabBar from "@/components/TabBar";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "OnAir",
  description: "Personal recovery dashboard for the Nilox OnAir band",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#0E1116", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-bg font-body text-ink antialiased">
        <AuthGate>
          <main className="mx-auto max-w-md px-5 pb-28 pt-6">{children}</main>
          <TabBar />
        </AuthGate>
        <SwRegister />
      </body>
    </html>
  );
}
