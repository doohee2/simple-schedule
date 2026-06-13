import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "약속 잡기 - Appointment Booking",
  description: "Effortless Coordination PWA App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "약속 잡기",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#f8f9fa" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a1c1e" media="(prefers-color-scheme: dark)" />
      </head>
      <body className={`${plusJakartaSans.variable} ${beVietnamPro.variable} bg-background text-on-background font-body-md antialiased min-h-screen relative overflow-hidden flex flex-col`}>
        {/* Background Layer Level 0 */}
        <div className="fixed inset-0 bg-surface dark:bg-[#1a1c1e] z-[-1]"></div>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
