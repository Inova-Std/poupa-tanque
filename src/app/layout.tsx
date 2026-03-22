import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Poupa Tanque - O Waze dos Combustíveis",
  description: "Encontre os postos mais baratos da sua região com preços em tempo real.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Poupa Tanque",
  },
};

export const viewport: Viewport = {
  themeColor: "#16a34a", // Green-600
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", inter.variable)}>
      <body className="antialiased bg-white selection:bg-green-100">
        {children}
      </body>
    </html>
  );
}
