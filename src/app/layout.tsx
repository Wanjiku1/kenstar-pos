import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kenstar Ops | Enterprise ERP",
  description: "Production, Inventory, and POS Management System",
  manifest: "/manifest.json",
  // Kenstar Green branding for mobile status bars
  themeColor: "#007a43", 
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* LAUNCH FIX: Force PWA to go straight to Terminal if it gets stuck on root */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (window.matchMedia('(display-mode: standalone)').matches && window.location.pathname === '/') {
              window.location.replace('/terminal');
            }
          })();
        ` }} />

        {children}
        <Toaster position="top-center" richColors closeButton />

        {/* SW registration and Auto-Update Logic */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('Kenstar SW Active');
                
                // If the code changes, tell the phone to refresh immediately
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