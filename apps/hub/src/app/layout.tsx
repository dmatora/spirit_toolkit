import type { Metadata, Viewport } from 'next';
import './global.css';
import GlobalLayoutClient from './global/GlobalLayoutClient';
import { StyledComponentsRegistry } from './registry';

export const metadata: Metadata = {
  title: 'Spirit Toolkit',
  description: 'Prayer and readings in one place.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#111827',
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body>
        <StyledComponentsRegistry>
          <GlobalLayoutClient>{children}</GlobalLayoutClient>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
