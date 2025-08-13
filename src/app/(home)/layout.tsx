import type { Metadata } from "next";
import Script from "next/script";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Toaster } from "@/components/toaster";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "Dashboard | Lemon Squeezy Next.js Billing Template",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main
      className={`${GeistSans.variable} ${GeistMono.variable} min-h-full font-sans`}
    >
      {/* Load the Lemon Squeezy's Lemon.js script before the page is interactive. */}
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="beforeInteractive"
      />

      <div className="text-surface-500 h-lvh text-sm leading-6 md:grid md:grid-cols-[270px_1fr]">
        <Sidebar />
        {children}
      </div>
      <Toaster position="bottom-right" />
    </main>
  );
}
