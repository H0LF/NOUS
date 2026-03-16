import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NOUS",
  description: "The AI-Powered Productivity App",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D", // nous-bg dark
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
          <script dangerouslySetInnerHTML={{
             __html: `
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                     window.addEventListener('load', function() {
                         navigator.serviceWorker.register('/sw.js').then(function(registration) {
                             console.log('ServiceWorker registration successful');
                         }, function(err) {
                             console.log('ServiceWorker registration failed: ', err);
                         });
                     });
                 }
                 
                 // Initial Theme Check
                 try {
                     const stored = localStorage.getItem('nous-theme-storage');
                     if (stored) {
                         const state = JSON.parse(stored).state;
                         if (state.theme === 'dark') {
                             document.documentElement.classList.add('dark');
                         } else {
                             document.documentElement.classList.remove('dark');
                         }
                     } else {
                         document.documentElement.classList.add('dark'); // Default dark
                     }
                 } catch (e) {}
             `
          }} />
      </head>
      <body className={`${inter.className} bg-nous-bg text-nous-primary overflow-hidden`}>
          {children}
          <Toaster 
              position="top-center"
              toastOptions={{
                  style: {
                      background: 'var(--nous-surface)',
                      color: 'var(--nous-primary)',
                      border: '1px solid var(--nous-border)',
                  },
              }}
          />
      </body>
    </html>
  );
}
