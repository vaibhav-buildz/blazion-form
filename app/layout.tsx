import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Blazion Form — India-First AI Form Builder',
  description: 'Build official, branded forms with AI insights, identity branding, regional languages, and seamless integrations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
