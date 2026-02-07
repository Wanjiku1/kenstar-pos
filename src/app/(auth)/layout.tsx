import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kenstar Ops',
  description: 'Kenstar ERP & Staff Terminal',
  manifest: '/manifest.json', // Points to the file we created
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Prevents auto-zoom on mobile inputs for a better "App" feel */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" /> 
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}