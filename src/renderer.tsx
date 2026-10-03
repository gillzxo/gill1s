// =====================================================================
// Global JSX renderer — HTML shell, SEO meta tags, Tailwind CDN config,
// schema.org LocalBusiness markup, and shared layout chrome (header,
// announcement bar, footer, floating WhatsApp button).
// =====================================================================
import { jsxRenderer } from 'hono/jsx-renderer'
import type { SiteSettings } from './lib/types'
import { DEFAULT_SETTINGS, whatsappLink } from './lib/settings'

export interface RenderMeta {
  title?: string
  description?: string
  ogImage?: string
  canonical?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
}

declare module 'hono' {
  interface ContextRenderer {
    (content: string | JSX.Element, meta?: RenderMeta): Response | Promise<Response>
  }
  interface ContextVariableMap {
    settings: SiteSettings
  }
}

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/coaching', label: 'Coaching' },
  { href: '/study-abroad', label: 'Study Abroad' },
  { href: '/education-loan', label: 'Education Loan' },
  { href: '/visa-results', label: 'Visa Results' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/news', label: 'News' },
  { href: '/contact', label: 'Contact' }
]

export const renderer = jsxRenderer((props, c) => {
  const { children, ...meta } = props as unknown as RenderMeta & { children: JSX.Element }
  const settings: SiteSettings = (c.get('settings') as SiteSettings) || DEFAULT_SETTINGS
  const path = new URL(c.req.url).pathname

  const title = meta.title ? `${meta.title} | ${settings.business_name}` : `${settings.business_name} — ${settings.tagline}`
  const description =
    meta.description ||
    `${settings.business_name} in Ludhiana, Punjab — expert IELTS/PTE coaching, study abroad guidance, education loan assistance, and visa services. Free consultation.`
  const ogImage = meta.ogImage || '/static/images/logo.png'
  const base = 'https://1stchoiceimmigration.com' // update after custom domain is connected
  const canonical = meta.canonical || `${base}${path}`
  const waLink = whatsappLink(settings.whatsapp_number, "Hi! I'd like a free consultation about studying abroad / IELTS coaching.")

  const localBusinessLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: settings.business_name,
    description,
    url: base,
    telephone: settings.phone_primary,
    email: settings.email,
    image: `${base}/static/images/logo.png`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressLocality: 'Ludhiana',
      addressRegion: 'Punjab',
      addressCountry: 'IN'
    },
    openingHours: 'Mo-Sa 10:00-19:00',
    sameAs: [settings.instagram_url, settings.facebook_url].filter(Boolean),
    aggregateRating: settings.google_rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: settings.google_rating,
          reviewCount: settings.google_review_count || '1'
        }
      : undefined
  }

  const jsonLdBlocks = [localBusinessLd, ...(meta.jsonLd || [])]

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        {meta.noindex ? <meta name="robots" content="noindex,nofollow" /> : <meta name="robots" content="index,follow" />}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage.startsWith('http') ? ogImage : `${base}${ogImage}`} />
        <meta property="og:url" content={canonical} />
        <meta property="og:site_name" content={settings.business_name} />

        {/* Twitter card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage.startsWith('http') ? ogImage : `${base}${ogImage}`} />

        <link rel="icon" type="image/png" href="/static/images/logo.png" />
        <link rel="apple-touch-icon" href="/static/images/logo.png" />

        {/* Tailwind CDN + brand theme config */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              tailwind.config = {
                theme: {
                  extend: {
                    colors: {
                      brand: {
                        blue: '#0b2559',
                        bluedark: '#061534',
                        bluelight: '#13407d',
                        red: '#f70009',
                        reddark: '#c40007'
                      }
                    },
                    fontFamily: {
                      sans: ['Inter', 'system-ui', 'sans-serif'],
                      display: ['Poppins', 'system-ui', 'sans-serif']
                    }
                  }
                }
              }
            `
          }}
        />

        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/css/app.css" rel="stylesheet" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBlocks.length === 1 ? jsonLdBlocks[0] : jsonLdBlocks) }}
        />
      </head>
      <body class="bg-white text-slate-800 antialiased">
        <a href="#main-content" class="skip-link">
          Skip to main content
        </a>

        {settings.announcement_bar_enabled === '1' && settings.announcement_bar_text ? (
          <div class="bg-brand-red text-white text-sm py-2 overflow-hidden">
            <div class="announce-track">
              <span class="px-6">{settings.announcement_bar_text}</span>
              <span class="px-6">{settings.announcement_bar_text}</span>
            </div>
          </div>
        ) : null}

        <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-20">
              <a href="/" class="flex items-center gap-3 shrink-0" aria-label={`${settings.business_name} home`}>
                <img src="/static/images/logo.png" alt={`${settings.business_name} logo`} class="h-14 w-auto" width="140" height="56" />
              </a>

              <nav class="hidden lg:flex items-center gap-7" aria-label="Primary navigation">
                {NAV_LINKS.map((link) => (
                  <a
                    href={link.href}
                    class={`text-sm font-semibold transition-colors hover:text-brand-red ${
                      path === link.href ? 'text-brand-red' : 'text-brand-blue'
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <div class="hidden lg:flex items-center gap-3">
                <a
                  href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
                  class="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-red"
                >
                  <i class="fa-solid fa-phone"></i> {settings.phone_primary}
                </a>
                <a
                  href="/contact"
                  class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white text-sm font-bold px-5 py-2.5 rounded-full shadow transition-colors"
                >
                  Free Consultation
                </a>
              </div>

              <button
                id="mobile-nav-toggle"
                class="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-brand-blue"
                aria-label="Open menu"
                aria-expanded="false"
                aria-controls="mobile-nav"
              >
                <i class="fa-solid fa-bars text-2xl"></i>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile nav drawer */}
        <div id="mobile-nav" class="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl lg:hidden flex flex-col">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <img src="/static/images/logo.png" alt={settings.business_name} class="h-10 w-auto" />
            <button id="mobile-nav-close" class="w-10 h-10 inline-flex items-center justify-center text-brand-blue" aria-label="Close menu">
              <i class="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
          <nav class="flex flex-col p-5 gap-1 overflow-y-auto" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                href={link.href}
                class={`px-3 py-3 rounded-lg text-base font-semibold ${
                  path === link.href ? 'bg-red-50 text-brand-red' : 'text-brand-blue hover:bg-slate-50'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div class="mt-auto p-5 border-t border-slate-100 flex flex-col gap-3">
            <a
              href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
              class="inline-flex items-center justify-center gap-2 border-2 border-brand-blue text-brand-blue font-bold py-3 rounded-full"
            >
              <i class="fa-solid fa-phone"></i> Call Us
            </a>
            <a href="/contact" class="inline-flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-full">
              Free Consultation
            </a>
          </div>
        </div>
        <div id="mobile-nav-backdrop" class="fixed inset-0 bg-black/40 z-40 hidden lg:hidden"></div>

        <main id="main-content">{children}</main>

        <footer class="bg-brand-bluedark text-slate-200 mt-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <img src="/static/images/logo.png" alt={settings.business_name} class="h-16 w-auto mb-4 bg-white rounded-lg p-1" />
              <p class="text-sm text-slate-400 leading-relaxed">
                Your trusted partner in Ludhiana for IELTS/PTE coaching, study abroad guidance, education loans, and visa services.
              </p>
              <div class="flex gap-3 mt-5">
                {settings.instagram_url ? (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-10 h-10 rounded-full bg-white/10 hover:bg-brand-red flex items-center justify-center transition-colors"
                    aria-label="Instagram"
                  >
                    <i class="fa-brands fa-instagram"></i>
                  </a>
                ) : null}
                {settings.facebook_url ? (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-10 h-10 rounded-full bg-white/10 hover:bg-brand-red flex items-center justify-center transition-colors"
                    aria-label="Facebook"
                  >
                    <i class="fa-brands fa-facebook-f"></i>
                  </a>
                ) : null}
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-10 h-10 rounded-full bg-white/10 hover:bg-brand-red flex items-center justify-center transition-colors"
                  aria-label="WhatsApp"
                >
                  <i class="fa-brands fa-whatsapp"></i>
                </a>
              </div>
            </div>

            <div>
              <h3 class="font-display font-bold text-white mb-4">Quick Links</h3>
              <ul class="space-y-2 text-sm">
                {NAV_LINKS.map((link) => (
                  <li>
                    <a href={link.href} class="text-slate-400 hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 class="font-display font-bold text-white mb-4">Study Destinations</h3>
              <ul class="space-y-2 text-sm">
                {['canada', 'uk', 'australia', 'usa', 'germany'].map((slug) => (
                  <li>
                    <a href={`/study-abroad/${slug}`} class="text-slate-400 hover:text-white transition-colors capitalize">
                      Study in {slug.toUpperCase() === 'UK' || slug.toUpperCase() === 'USA' ? slug.toUpperCase() : slug.charAt(0).toUpperCase() + slug.slice(1)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 class="font-display font-bold text-white mb-4">Contact Us</h3>
              <ul class="space-y-3 text-sm text-slate-400">
                <li class="flex items-start gap-2">
                  <i class="fa-solid fa-location-dot mt-1 text-brand-red"></i>
                  <span>{settings.address}</span>
                </li>
                <li class="flex items-center gap-2">
                  <i class="fa-solid fa-phone text-brand-red"></i>
                  <a href={`tel:${settings.phone_primary.replace(/\s/g, '')}`} class="hover:text-white">
                    {settings.phone_primary}
                  </a>
                </li>
                <li class="flex items-center gap-2">
                  <i class="fa-solid fa-envelope text-brand-red"></i>
                  <a href={`mailto:${settings.email}`} class="hover:text-white">
                    {settings.email}
                  </a>
                </li>
                <li class="flex items-center gap-2">
                  <i class="fa-solid fa-clock text-brand-red"></i>
                  <span>{settings.office_hours}</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="border-t border-white/10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <p>&copy; {new Date().getFullYear()} {settings.business_name}. All rights reserved.</p>
              <div class="flex gap-5">
                <a href="/privacy-policy" class="hover:text-white">
                  Privacy Policy
                </a>
                <a href="/terms" class="hover:text-white">
                  Terms &amp; Conditions
                </a>
                <a href="/admin" class="hover:text-white">
                  Admin Login
                </a>
              </div>
            </div>
          </div>
        </footer>

        {/* Floating WhatsApp button */}
        <a href={waLink} target="_blank" rel="noopener noreferrer" class="whatsapp-float" aria-label="Chat on WhatsApp">
          <i class="fa-brands fa-whatsapp text-white text-3xl"></i>
        </a>

        <script src="/static/js/app.js"></script>
      </body>
    </html>
  )
})
