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

import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import BadgeStealToast from "@/components/BadgeStealToast";

export const metadata: Metadata = {
  title: "Pompes entre potes",
  description: "Trackez vos pompes avec vos amis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <AuthProvider>
          <Navbar />
          {children}
          <div className="pb-20 sm:pb-0">
            <BadgeStealToast />
            <MobileNav />
          </div>
        </AuthProvider>
      </body>

    </html>
  );
}
