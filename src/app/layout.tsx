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
  viewportFit: "cover", 
};

export const metadata: Metadata = {
  title: "Kenstar Ops | Uniforms ERP",
  description: "Official Attendance, Inventory, and Production Management for Kenstar Uniforms.",
  manifest: "/manifest.json",
  // This prevents the internal terminal from showing up on Google search results
  robots: {
    index: false,
    follow: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kenstar Ops",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/icon-192.png", sizes: "192x192" },
      { url: "/icon-512.png", sizes: "512x512" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-green-100`}
        suppressHydrationWarning
      >
        {/* Redirect Logic: Forces home-screen icon users straight to the Terminal */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                                 || window.navigator.standalone === true;
              if (isStandalone && window.location.pathname === '/') {
                window.location.replace('/terminal');
              }
            } catch (e) { console.error(e); }
          })();
        ` }} />

        {children}
        
        <Toaster position="top-center" richColors closeButton />

        {/* Service Worker: Handles Offline Mode & Automatic Updates */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('Kenstar Uniforms SW Active');
                
                reg.onupdatefound = () => {
                  const installingWorker = reg.installing;
                  if (installingWorker) {
                    installingWorker.onstatechange = () => {
                      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Automatically refreshes the app when you push a new update to Vercel
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