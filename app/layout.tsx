import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)',
  description:
    'Camparify: Compare real-time ride prices, ETAs, and road distance across Rapido and Bharat Taxi with OpenFreeMap.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
      </head>
      <body className="min-h-screen transition-colors duration-200 selection:bg-blue-600 selection:text-white relative">
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
