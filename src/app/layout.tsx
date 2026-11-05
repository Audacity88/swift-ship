import ClientLayout from "@/components/layout/ClientLayout";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Customer Support Dashboard",
  description: "Customer Support Dashboard with Analytics and Ticket Management",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/favicon-32x32.png'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        inter.className,
        "antialiased",
        "bg-background text-foreground"
      )} suppressHydrationWarning>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
          {/* Top placement keeps toasts off the reply composer and its Send button. */}
          <Toaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
