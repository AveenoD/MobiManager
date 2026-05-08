'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  CreditCard,
  Package,
  ShieldCheck,
  ShoppingCart,
  Store,
  Wrench,
} from 'lucide-react';

type Lang = 'en' | 'hi' | 'hi-Latn' | 'mr';
const LANG_KEY = 'mobimgr_lang';

type Feature = {
  key: string;
  name: string;
  description: string;
  badge: 'Included' | 'Add-on';
  icon: React.ReactNode;
};

const copy = {
  en: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Login', trial: 'Start free trial' },
    hero: {
      title: 'Run your mobile shop with confidence.',
      subtitle:
        'Inventory, sales, and repairs are included. Add recharge, advanced reports, audit trail and AI packs when you need them.',
      ctaPrimary: 'Create account',
      ctaSecondary: 'Login',
      trust: ['Data isolation', 'Fast setup', 'Works on browser'],
    },
    sections: {
      coreTitle: 'Core modules (included)',
      addOnTitle: 'Add-ons (unlock when needed)',
      whyTitle: 'Built for real shop operations',
      faqTitle: 'FAQs',
      ctaTitle: 'Start with a plan that fits',
      ctaSubtitle: 'Start with Starter. Upgrade anytime.',
      ctaButton: 'Start free trial',
    },
    why: [
      { title: 'Tenant isolation', body: 'Your data stays inside your account.' },
      { title: 'Audit-ready records', body: 'Track important updates with reasoned history.' },
      { title: 'Operational dashboards', body: 'Daily sales, repairs and inventory signals at a glance.' },
      { title: 'Add-ons, not clutter', body: 'Enable add-ons only when you need them.' },
    ],
    faq: [
      {
        q: 'Is inventory, sales and repair included?',
        a: 'Yes. Inventory, sales & billing, and repair tracking are included as core modules.',
      },
      {
        q: 'How do add-ons work?',
        a: 'Add-ons can be purchased and enabled, such as recharge, advanced reports, audit trail, multi-shop, extra seats and AI packs.',
      },
      {
        q: 'Can I change language later?',
        a: 'Yes. Use the language selector in the header. We’ll persist your choice in this browser.',
      },
    ],
    langLabel: 'Language',
  },
  hi: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Login', trial: 'Free trial start karein' },
    hero: {
      title: 'Apni mobile shop ko confidently chalaiye.',
      subtitle:
        'Inventory, sales aur repairs included hain. Recharge, advanced reports, audit trail aur AI packs zarurat par add kar sakte hain.',
      ctaPrimary: 'Account banayein',
      ctaSecondary: 'Login',
      trust: ['Data isolation', 'Fast setup', 'Browser par chalega'],
    },
    sections: {
      coreTitle: 'Core modules (included)',
      addOnTitle: 'Add-ons (zarurat par unlock)',
      whyTitle: 'Real shop operations ke liye',
      faqTitle: 'FAQs',
      ctaTitle: 'Apne hisaab se plan choose karein',
      ctaSubtitle: 'Starter se shuru kijiye. Kabhi bhi upgrade.',
      ctaButton: 'Free trial start karein',
    },
    why: [
      { title: 'Tenant isolation', body: 'Aapka data aapke account me safe rehta hai.' },
      { title: 'Audit-ready records', body: 'Important updates ka reasoned history maintain hota hai.' },
      { title: 'Operational dashboards', body: 'Sales, repairs aur inventory signals ek nazar me.' },
      { title: 'Add-ons, not clutter', body: 'Sirf zarurat wale add-ons enable kijiye.' },
    ],
    faq: [
      {
        q: 'Kya inventory, sales aur repair included hai?',
        a: 'Haan. Inventory, sales & billing, aur repair tracking core modules me included hain.',
      },
      {
        q: 'Add-ons kaise kaam karte hain?',
        a: 'Recharge, advanced reports, audit trail, multi-shop, extra seats aur AI packs jaise add-ons purchase karke enable kiye ja sakte hain.',
      },
      {
        q: 'Language baad me change ho sakti hai?',
        a: 'Haan. Header me language selector se change kijiye. Choice is browser me save rahegi.',
      },
    ],
    langLabel: 'Language',
  },
  'hi-Latn': {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Login', trial: 'Free trial start karein' },
    hero: {
      title: 'Apni mobile shop ko confidently chalaiye.',
      subtitle:
        'Inventory, sales aur repairs included hain. Recharge, advanced reports, audit trail aur AI packs zarurat par add kar sakte hain.',
      ctaPrimary: 'Account banayein',
      ctaSecondary: 'Login',
      trust: ['Data isolation', 'Fast setup', 'Browser par chalega'],
    },
    sections: {
      coreTitle: 'Core modules (included)',
      addOnTitle: 'Add-ons (zarurat par unlock)',
      whyTitle: 'Real shop operations ke liye',
      faqTitle: 'FAQs',
      ctaTitle: 'Apne hisaab se plan choose karein',
      ctaSubtitle: 'Starter se shuru kijiye. Kabhi bhi upgrade.',
      ctaButton: 'Free trial start karein',
    },
    why: [
      { title: 'Tenant isolation', body: 'Aapka data aapke account me safe rehta hai.' },
      { title: 'Audit-ready records', body: 'Important updates ka reasoned history maintain hota hai.' },
      { title: 'Operational dashboards', body: 'Sales, repairs aur inventory signals ek nazar me.' },
      { title: 'Add-ons, not clutter', body: 'Sirf zarurat wale add-ons enable kijiye.' },
    ],
    faq: [
      {
        q: 'Kya inventory, sales aur repair included hai?',
        a: 'Haan. Inventory, sales & billing, aur repair tracking core modules me included hain.',
      },
      {
        q: 'Add-ons kaise kaam karte hain?',
        a: 'Recharge, advanced reports, audit trail, multi-shop, extra seats aur AI packs jaise add-ons purchase karke enable kiye ja sakte hain.',
      },
      {
        q: 'Language baad me change ho sakti hai?',
        a: 'Haan. Header me language selector se change kijiye. Choice is browser me save rahegi.',
      },
    ],
    langLabel: 'Language',
  },
  mr: {
    nav: { features: 'Features', pricing: 'Pricing', login: 'Login', trial: 'Free trial suru kara' },
    hero: {
      title: 'Aapli mobile shop confidentpane chalva.',
      subtitle:
        'Inventory, sales ani repairs included ahet. Recharge, advanced reports, audit trail ani AI packs गरजेनुसार add karu shakta.',
      ctaPrimary: 'Account तयार करा',
      ctaSecondary: 'Login',
      trust: ['Data isolation', 'Fast setup', 'Browser var chalel'],
    },
    sections: {
      coreTitle: 'Core modules (included)',
      addOnTitle: 'Add-ons (गरजेनुसार unlock)',
      whyTitle: 'Real shop operations साठी',
      faqTitle: 'FAQs',
      ctaTitle: 'Aaplya गरजेप्रमाणे plan निवडा',
      ctaSubtitle: 'Starter पासून सुरुवात करा. नंतर upgrade करा.',
      ctaButton: 'Free trial suru kara',
    },
    why: [
      { title: 'Tenant isolation', body: 'Tumcha data tumchya account madhye safe rahato.' },
      { title: 'Audit-ready records', body: 'महत्त्वाच्या updates साठी reasoned history.' },
      { title: 'Operational dashboards', body: 'Sales, repairs ani inventory signals ek nazaret.' },
      { title: 'Add-ons, not clutter', body: 'फक्त गरजेचे add-ons enable करा.' },
    ],
    faq: [
      {
        q: 'Inventory, sales ani repair included ahet ka?',
        a: 'Ho. Inventory, sales & billing, ani repair tracking core modules madhye included ahet.',
      },
      {
        q: 'Add-ons kसे काम करतात?',
        a: 'Recharge, advanced reports, audit trail, multi-shop, extra seats ani AI packs हे purchase करून enable करता येतात.',
      },
      {
        q: 'Language नंतर बदलू शकतो का?',
        a: 'हो. Header मधील language selector वापरा. Choice या browser मध्ये save राहील.',
      },
    ],
    langLabel: 'Language',
  },
} satisfies Record<Lang, any>;

const languageOptions: Array<{ id: Lang; label: string }> = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'hi-Latn', label: 'Hinglish' },
  { id: 'mr', label: 'मराठी' },
];

function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && (localStorage.getItem(LANG_KEY) as Lang)) || null;
    if (saved && ['en', 'hi', 'hi-Latn', 'mr'].includes(saved)) setLang(saved);
  }, []);
  const set = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      // ignore
    }
  };
  return [lang, set];
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

export default function LandingClient() {
  const [lang, setLang] = useLang();
  const t = copy[lang] ?? copy.en;

  const coreFeatures: Feature[] = useMemo(
    () => [
      {
        key: 'inventory',
        name: 'Inventory Management',
        description: 'Track products, stock movements, and low-stock alerts across shops.',
        badge: 'Included',
        icon: <Package className="h-5 w-5" />,
      },
      {
        key: 'sales',
        name: 'Sales & Billing',
        description: 'Record sales, manage payments, and track pending amounts.',
        badge: 'Included',
        icon: <ShoppingCart className="h-5 w-5" />,
      },
      {
        key: 'repair',
        name: 'Repair Tracking',
        description: 'Track repair jobs from receipt to delivery with parts usage.',
        badge: 'Included',
        icon: <Wrench className="h-5 w-5" />,
      },
    ],
    []
  );

  const addOns: Feature[] = useMemo(
    () => [
      {
        key: 'recharge',
        name: 'Mobile & DTH Recharge',
        description: 'Process mobile, DTH, and electricity bill recharges.',
        badge: 'Add-on',
        icon: <CreditCard className="h-5 w-5" />,
      },
      {
        key: 'reports',
        name: 'Advanced Reports',
        description: 'Profit/loss statements, sales analytics, and custom reports.',
        badge: 'Add-on',
        icon: <BarChart3 className="h-5 w-5" />,
      },
      {
        key: 'audit',
        name: 'Audit Trail',
        description: 'Track every change to inventory, sales, and repairs with full history.',
        badge: 'Add-on',
        icon: <ClipboardList className="h-5 w-5" />,
      },
      {
        key: 'multiShop',
        name: 'Multi-Shop Management',
        description: 'Manage multiple shops, each with its own inventory and staff.',
        badge: 'Add-on',
        icon: <Store className="h-5 w-5" />,
      },
      {
        key: 'ai',
        name: 'AI Packs',
        description:
          'OCR receipt scan, festival offers, slow stock ideas, monthly strategy and language assist.',
        badge: 'Add-on',
        icon: <Bot className="h-5 w-5" />,
      },
      {
        key: 'notifications',
        name: 'In-app Notifications',
        description: 'Manual + automatic notifications (plan expiry, system updates).',
        badge: 'Add-on',
        icon: <Bell className="h-5 w-5" />,
      },
    ],
    []
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'MobiManager',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description: 'Mobile shop management software for Indian retailers',
            offers: [
              { '@type': 'Offer', price: '199', priceCurrency: 'INR', name: 'Starter' },
              { '@type': 'Offer', price: '399', priceCurrency: 'INR', name: 'Pro' },
              { '@type': 'Offer', price: '699', priceCurrency: 'INR', name: 'Elite' },
            ],
          }),
        }}
      />

      <div className="min-h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">MobiManager</span>
            </motion.div>

            <div className="hidden items-center gap-6 md:flex">
              <Link className="text-sm text-gray-700 hover:text-blue-600" href="/features">
                {t.nav.features}
              </Link>
              <Link className="text-sm text-gray-700 hover:text-blue-600" href="/pricing">
                {t.nav.pricing}
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t.langLabel}</span>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Lang)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-blue-500"
                >
                  {languageOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <Link className="text-sm text-gray-700 hover:text-blue-600" href="/admin/login">
                {t.nav.login}
              </Link>
              <Link
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
                href="/admin/register"
              >
                {t.nav.trial}
              </Link>
            </div>
          </nav>
        </header>

        <main>
          <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
            <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

            <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
              <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-3xl">
                <motion.h1
                  variants={fadeUp}
                  className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
                >
                  {t.hero.title}
                </motion.h1>
                <motion.p variants={fadeUp} className="mt-5 text-lg text-blue-100">
                  {t.hero.subtitle}
                </motion.p>

                <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/admin/register"
                      className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                    >
                      {t.hero.ctaPrimary}
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link
                      href="/admin/login"
                      className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      {t.hero.ctaSecondary}
                    </Link>
                  </motion.div>
                </motion.div>

                <motion.div variants={fadeUp} className="mt-10 flex flex-wrap gap-3">
                  {t.hero.trust.map((x: string) => (
                    <span
                      key={x}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-blue-50"
                    >
                      {x}
                    </span>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="grid gap-10 lg:grid-cols-2"
            >
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{t.sections.coreTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Core modules are available out of the box for every shop.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {coreFeatures.map((f) => (
                    <FeatureCard key={f.key} feature={f} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{t.sections.addOnTitle}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  Add-ons are gated in the backend and can be enabled when needed.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {addOns.map((f) => (
                    <FeatureCard key={f.key} feature={f} />
                  ))}
                </div>
              </div>
            </motion.div>
          </section>

          <section className="bg-gray-50 py-14">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-2xl font-semibold tracking-tight">{t.sections.whyTitle}</h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {t.why.map((w: any) => (
                    <motion.div
                      key={w.title}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition"
                    >
                      <div className="text-sm font-semibold">{w.title}</div>
                      <div className="mt-2 text-sm text-gray-600">{w.body}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-2xl font-semibold tracking-tight">{t.sections.faqTitle}</h2>
              <div className="mt-6 space-y-3">
                {t.faq.map((x: any, idx: number) => (
                  <FaqItem key={idx} q={x.q} a={x.a} />
                ))}
              </div>
            </motion.div>
          </section>

          <section className="py-14">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-white"
              >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <h2 className="text-3xl font-semibold tracking-tight">{t.sections.ctaTitle}</h2>
                  <p className="mt-2 text-blue-100">{t.sections.ctaSubtitle}</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        href="/admin/register"
                        className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-700"
                      >
                        {t.sections.ctaButton}
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                      <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white"
                      >
                        {t.nav.pricing}
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-gray-600 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
            <div>© {new Date().getFullYear()} MobiManager. All rights reserved.</div>
            <div className="flex flex-wrap gap-4">
              <Link className="hover:text-blue-600" href="/features">
                {t.nav.features}
              </Link>
              <Link className="hover:text-blue-600" href="/pricing">
                {t.nav.pricing}
              </Link>
              <Link className="hover:text-blue-600" href="/admin/login">
                {t.nav.login}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl" />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gray-50 text-gray-800">
            {feature.icon}
          </div>
          <div>
            <div className="text-sm font-semibold">{feature.name}</div>
            <div className="mt-1 text-sm text-gray-600">{feature.description}</div>
          </div>
        </div>
        <span
          className={
            feature.badge === 'Included'
              ? 'shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700'
              : 'shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700'
          }
        >
          {feature.badge}
        </span>
      </div>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold">{q}</span>
        <span className="text-gray-500">{open ? '−' : '+'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="px-5 pb-5 text-sm text-gray-600">{a}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

