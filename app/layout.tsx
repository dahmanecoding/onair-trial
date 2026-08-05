import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";
import BottomNav from "@/components/BottomNav";
import SwRegister from "@/components/SwRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { DateProvider } from "@/components/DateContext";

export const metadata: Metadata = {
  title: "OnAir",
  description: "Personal recovery dashboard for the Nilox OnAir band",
  manifest: "/manifest.json",
};
export const viewport: Viewport = { themeColor: "#0E1116", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased bg-mesh text-ink dark:text-white transition-colors duration-500">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <DateProvider>
            <AuthGate>
              <main className="mx-auto max-w-md px-4 pb-28 pt-6 relative min-h-screen">
                {children}
              </main>
              <BottomNav />
            </AuthGate>
            <SwRegister />
          </DateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
