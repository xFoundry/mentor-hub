import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || "http://localhost:3000"),
  title: {
    default: "Mentor Hub - Mentorship Portal",
    template: "%s | Mentor Hub",
  },
  description: "Connect with mentors, track sessions, and manage action items",
  icons: {
    icon: [
      { url: "/x-icon-white.png", media: "(prefers-color-scheme: light)" },
      { url: "/x-icon-blue.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/x-icon-blue.png",
  },
  openGraph: {
    type: "website",
    siteName: "Mentor Hub",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
