import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MobiManager — Mobile Shop Management Software',
  description: 'India ka #1 mobile shop management software. Track mobile sales, repair jobs, accessories inventory, recharge records.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
