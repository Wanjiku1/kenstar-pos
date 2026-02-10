import { Metadata, Viewport } from 'next';

// 1. Viewport handles the zoom prevention and theme color
export const viewport: Viewport = {
  themeColor: '#1d4ed8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};

// 2. Metadata handles the Manifest and Apple App settings
export const metadata: Metadata = {
  title: 'Kenstar Ops',
  description: 'Kenstar ERP & Staff Terminal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kenstar Ops',
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // REMOVE: <html>, <head>, and <body> tags
  // Next.js will automatically merge the metadata above into your Root Layout
  return <>{children}</>;
}