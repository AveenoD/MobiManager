import type { Metadata } from 'next';
import LandingClient from './LandingClient';

export const metadata: Metadata = {
  title: 'MobiManager — Mobile Shop Management Software | Repair & Sales Tracking',
  description:
    'Mobile shop management software for Indian retailers. Track inventory, sales, repairs, and add-ons like recharge, advanced reports, audit trail and AI packs.',
  keywords: [
    'mobile shop management software',
    'mobile repair shop software india',
    'mobile shop billing software',
    'mobile shop inventory management',
    'repair tracking software',
    'mobile accessories inventory',
    'mobile shop record keeping',
    'mobile shop pos software',
    'mobile recharge record software',
    'small shop management app india',
    'dukan management software',
    'mobile shop khata software',
    'repair shop management system',
    'mobile shop daily report',
    'phone repair business software',
  ],
  openGraph: {
    title: 'MobiManager — Mobile Shop Management Software',
    description: 'Track sales, repairs, inventory & recharge. Made for Indian mobile shops.',
    type: 'website',
    locale: 'en_IN',
  },
  alternates: {
    canonical: 'https://mobimgr.com',
  },
  robots: 'index, follow',
};

export default function LandingPage() {
  return (
    <>
      <LandingClient />
    </>
  );
}
