import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({ 
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-fraunces',
});

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
      <body className={`${inter.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
