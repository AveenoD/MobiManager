import { jsxRenderer } from 'hono/jsx-renderer'

const defaultCanonical = 'https://mobimgr.com'
const seoTitle = 'MobiManager — Mobile Shop Management Software | Repair & Sales Tracking'
const seoDescription =
  'Mobile shop management software for Indian retailers. Track inventory, sales, repairs, and add-ons like recharge, advanced reports, audit trail and AI packs.'
const seoKeywords = [
  'mobile shop management software',
  'mobile repair shop software india',
  'mobile shop billing software',
  'mobile shop inventory management',
  'repair tracking software',
  'mobile accessories inventory',
  'small shop management app india',
  'phone repair business software',
].join(', ')

function publicCanonicalBase(): string {
  if (typeof process !== 'undefined' && process.env.SITE_PUBLIC_URL) {
    return process.env.SITE_PUBLIC_URL.replace(/\/$/, '')
  }
  return defaultCanonical
}

export const renderer = jsxRenderer(({ children }) => {
  const canonical = publicCanonicalBase()
  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'MobiManager',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: seoDescription,
    offers: [
      { '@type': 'Offer', price: '199', priceCurrency: 'INR', name: 'Starter' },
      { '@type': 'Offer', price: '399', priceCurrency: 'INR', name: 'Pro' },
      { '@type': 'Offer', price: '699', priceCurrency: 'INR', name: 'Elite' },
    ],
  }

  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5" />
        <meta name="theme-color" content="#0a0a0f" />
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonical} />

        <meta property="og:title" content="MobiManager — Mobile Shop Management Software" />
        <meta property="og:description" content="Track sales, repairs, inventory & recharge. Made for Indian mobile shops." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content="en_IN" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="MobiManager — Mobile Shop Management Software" />
        <meta name="twitter:description" content="Track sales, repairs, inventory & recharge. Made for Indian mobile shops." />

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />

        {/* Inline SVG favicon — no extra request, matches brand gradient */}
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%236366f1'/%3E%3Cstop offset='100%25' stop-color='%2306b6d4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Cpath d='M22 18h20a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4Zm0 4v18h20V22H22Zm6 22h8v2h-8v-2Z' fill='white'/%3E%3C/svg%3E"
        />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />

        {/* Premium typography */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />

        {/* Tailwind CSS via CDN with config */}
        <script src="https://cdn.tailwindcss.com"></script>

        {/* Font Awesome for icons */}
        <link
          href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css"
          rel="stylesheet"
        />

        {/* Tailwind config */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ['Inter', 'system-ui', 'sans-serif'],
                    display: ['Space Grotesk', 'Inter', 'sans-serif'],
                    mono: ['JetBrains Mono', 'monospace'],
                  },
                  colors: {
                    brand: {
                      50: '#eef2ff',
                      100: '#e0e7ff',
                      200: '#c7d2fe',
                      300: '#a5b4fc',
                      400: '#818cf8',
                      500: '#6366f1',
                      600: '#4f46e5',
                      700: '#4338ca',
                      800: '#3730a3',
                      900: '#312e81',
                    },
                    accent: {
                      400: '#22d3ee',
                      500: '#06b6d4',
                      600: '#0891b2',
                    },
                    ink: {
                      950: '#05060a',
                      900: '#0a0a0f',
                      800: '#111118',
                      700: '#1a1a24',
                      600: '#252533',
                    }
                  },
                  animation: {
                    'gradient': 'gradient 8s ease infinite',
                    'float': 'float 6s ease-in-out infinite',
                    'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
                  }
                }
              }
            }
          `,
          }}
        />

        {/* Custom CSS */}
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="bg-ink-950 text-white antialiased font-sans">
        {/* Scroll progress bar */}
        <div id="scroll-progress" class="fixed top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-brand-400 via-accent-400 to-pink-400 z-[90] transition-[width] duration-150 ease-out"></div>

        {/* Custom cursor: visibility controlled in style.css (fine pointer + no reduced motion) */}
        <div id="cursor-ring" aria-hidden="true"></div>
        <div id="cursor-dot" aria-hidden="true"></div>

        {children}

        {/* GSAP for scroll animations (loaded async, animations are progressive enhancement) */}
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
        <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>

        {/* App JS */}
        <script src="/static/app.js" defer></script>
      </body>
    </html>
  )
})
