import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { AuthGuard } from '@/components/auth/auth-guard'; // Ensure this path is correct

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kenstar Ops | Enterprise ERP",
  description: "Production, Inventory, and POS Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        
        {/* FIX: Wrap children in AuthGuard to force login */}
        <AuthGuard>
          {children}
        </AuthGuard>

        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          expand={false}
        />
      </body>
    </html>
  );
}