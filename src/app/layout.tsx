import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#007a43",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", // Fixes the white bars on modern phones
};

export const metadata: Metadata = {
  title: "Kenstar Ops | Enterprise ERP",
  description: "Production, Inventory, and POS Management System",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning is key to stopping the blank screen crash
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              if (window.matchMedia('(display-mode: standalone)').matches && window.location.pathname === '/') {
                window.location.replace('/terminal');
              }
            } catch (e) { console.error(e); }
          })();
        ` }} />

        {children}
        <Toaster position="top-center" richColors closeButton />

        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('Kenstar SW Active');
                reg.onupdatefound = () => {
                  const installingWorker = reg.installing;
                  if (installingWorker) {
                    installingWorker.onstatechange = () => {
                      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                      }
                    };
                  }
                };
              }).catch(function(err) {
                console.log('SW Error', err);
              });
            });
          }
        ` }} />
      </body>
    </html>
  );
}