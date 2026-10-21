import type { Metadata, Viewport } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://comparify-i59gdzl4z-kanxer.vercel.app';
const ogImageUrl = `${siteUrl}/og-image.jpg`;

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)',
    template: '%s | Camparify',
  },
  description:
    'Camparify: Compare live ride fares, ETAs, and routes across Rapido and Bharat Taxi instantly. Zero hidden surge, 8-column standard comparison, and instant Excel export.',
  applicationName: 'Camparify',
  authors: [{ name: 'Camparify' }],
  keywords: [
    'Rapido',
    'Bharat Taxi',
    'Cab Fare Comparison',
    'Bike Taxi Gorakhpur',
    'Auto Fare Comparison',
    'Live Taxi Rates UP',
    'Ride Price Comparison India',
  ],
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'Camparify',
    title: 'Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)',
    description:
      'Compare live ride fares across Rapido and Bharat Taxi instantly. Zero hidden surge, standard 8-column comparison, and instant Excel export.',
    images: [
      {
        url: ogImageUrl,
        secureUrl: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Camparify - Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)',
    description:
      'Compare live ride fares across Rapido and Bharat Taxi instantly. Zero hidden surge, standard 8-column comparison, and instant Excel export.',
    images: [ogImageUrl],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for low-latency tile loading */}
        <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />

        {/* WhatsApp & Social Media Open Graph explicit tags */}
        <meta property="og:title" content="Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)" />
        <meta property="og:description" content="Compare live ride fares across Rapido and Bharat Taxi instantly. Zero hidden surge, standard 8-column comparison, and instant Excel export." />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:secure_url" content={ogImageUrl} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Camparify - Real-Time Ride Fare Comparison" />
        <meta property="og:site_name" content="Camparify" />
        <meta property="og:type" content="website" />

        {/* Twitter Card explicit tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Camparify | Real-Time Ride Fare Comparison (Rapido vs Bharat Taxi)" />
        <meta name="twitter:description" content="Compare live ride fares across Rapido and Bharat Taxi instantly. Zero hidden surge, standard 8-column comparison, and instant Excel export." />
        <meta name="twitter:image" content={ogImageUrl} />
      </head>
      <body className="min-h-screen transition-colors duration-200 selection:bg-blue-600 selection:text-white relative">
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
