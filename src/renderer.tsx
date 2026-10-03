// =====================================================================
// Global JSX renderer — HTML shell, SEO meta tags, Tailwind CDN config,
// schema.org LocalBusiness markup, and shared layout chrome (header,
// announcement bar, footer, floating WhatsApp button).
// =====================================================================
import { jsxRenderer } from 'hono/jsx-renderer'
import type { SiteSettings } from './lib/types'
import { DEFAULT_SETTINGS, whatsappLink } from './lib/settings'
import { EnquiryForm } from './components/EnquiryForm'

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

// Flat list kept for the footer "Quick Links" column and for simple
// active-path checks. The header itself groups related pages under
// "Coaching" and "Study Abroad" dropdowns — see <header> below.
const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/coaching', label: 'Coaching' },
  { href: '/score-charts', label: 'IELTS/PTE Score Charts' },
  { href: '/study-abroad', label: 'Study Abroad' },
  { href: '/visitor-visa', label: 'Visitor Visa' },
  { href: '/visa-results', label: 'Visa Results' },
  { href: '/education-loan', label: 'Education Loan' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/news', label: 'News' },
  { href: '/contact', label: 'Contact' },
  { href: '/register', label: 'Register' }
]

// Primary header nav: a short, uncluttered top-level list with two
// grouped dropdowns (Coaching, Study Abroad) so related pages (Score
// Charts, Visitor Visa, Visa Results) don't each need their own slot.
const NAV_GROUPS: { label: string; href: string; children?: { href: string; label: string; desc: string; icon: string }[] }[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Coaching',
    href: '/coaching',
    children: [
      { href: '/coaching', label: 'IELTS / PTE Coaching', desc: 'Courses, fees & faculty', icon: 'fa-chalkboard-user' },
      { href: '/score-charts', label: 'Score Charts & Converter', desc: 'IELTS, PTE, PTE Core, CLB', icon: 'fa-chart-simple' }
    ]
  },
  {
    label: 'Study Abroad',
    href: '/study-abroad',
    children: [
      { href: '/study-abroad', label: 'Explore Destinations', desc: 'Canada, UK, Australia, USA, NZ, Europe', icon: 'fa-earth-asia' },
      { href: '/visitor-visa', label: 'Visitor Visa Guide', desc: 'Document checklist & SOP tips', icon: 'fa-passport' },
      { href: '/visa-results', label: 'Visa Results Gallery', desc: 'Real student approvals', icon: 'fa-image' }
    ]
  },
  { label: 'Education Loan', href: '/education-loan' },
  { label: 'Contact', href: '/contact' }
]

export const renderer = jsxRenderer((props, c) => {
  const { children, ...meta } = props as unknown as RenderMeta & { children: JSX.Element }
  const settings: SiteSettings = (c.get('settings') as SiteSettings) || DEFAULT_SETTINGS
  const path = new URL(c.req.url).pathname

  const title = meta.title ? `${meta.title} | ${settings.business_name}` : `${settings.business_name} — ${settings.tagline}`
  const description =
    meta.description ||
    `${settings.business_name} in Bagha Purana, Moga, Punjab — expert IELTS/PTE coaching, study abroad guidance, education loan assistance, and visa services. Free consultation.`
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
      addressLocality: 'Bagha Purana',
      addressRegion: 'Punjab',
      postalCode: '142038',
      addressCountry: 'IN'
    },
    foundingDate: settings.founded_year || '2018',
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

              <nav class="hidden xl:flex items-center gap-1" aria-label="Primary navigation">
                {NAV_GROUPS.map((group) =>
                  group.children ? (
                    <div class="nav-item relative px-3 py-2">
                      <a
                        href={group.href}
                        class={`flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors hover:text-brand-red ${
                          path === group.href || group.children.some((ch) => ch.href === path) ? 'text-brand-red' : 'text-brand-blue'
                        }`}
                      >
                        {group.label} <i class="fa-solid fa-chevron-down nav-chevron text-[10px] mt-0.5"></i>
                      </a>
                      <div class="nav-dropdown-panel absolute left-0 top-full pt-2 w-72 z-50">
                        <div class="bg-white rounded-xl shadow-2xl border border-slate-100 p-2">
                          {group.children.map((child) => (
                            <a href={child.href} class={`flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 ${path === child.href ? 'bg-red-50' : ''}`}>
                              <span class="w-9 h-9 rounded-lg bg-red-50 text-brand-red flex items-center justify-center shrink-0">
                                <i class={`fa-solid ${child.icon} text-sm`}></i>
                              </span>
                              <span>
                                <span class="block text-sm font-bold text-brand-blue">{child.label}</span>
                                <span class="block text-xs text-slate-400">{child.desc}</span>
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={group.href}
                      class={`px-3 py-2 text-[13px] font-semibold whitespace-nowrap transition-colors hover:text-brand-red ${
                        path === group.href ? 'text-brand-red' : 'text-brand-blue'
                      }`}
                    >
                      {group.label}
                    </a>
                  )
                )}
              </nav>

              <div class="hidden xl:flex items-center gap-3">
                <a
                  href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
                  class="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:text-brand-red"
                  aria-label={`Call ${settings.phone_primary}`}
                >
                  <i class="fa-solid fa-phone"></i>
                </a>
                <a
                  href="/register"
                  class="cta-pulse inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white text-sm font-bold px-5 py-2.5 rounded-full shadow transition-colors"
                >
                  <i class="fa-solid fa-user-plus"></i> Register Free
                </a>
              </div>

              <button
                id="mobile-nav-toggle"
                class="xl:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-brand-blue"
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
        <div id="mobile-nav" class="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl xl:hidden flex flex-col">
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <img src="/static/images/logo.png" alt={settings.business_name} class="h-10 w-auto" />
            <button id="mobile-nav-close" class="w-10 h-10 inline-flex items-center justify-center text-brand-blue" aria-label="Close menu">
              <i class="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>
          <nav class="flex flex-col p-5 gap-1 overflow-y-auto" aria-label="Mobile navigation">
            {NAV_GROUPS.map((group, gi) =>
              group.children ? (
                <div>
                  <button
                    type="button"
                    data-mobile-submenu-toggle={`mg-${gi}`}
                    class={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-base font-semibold ${
                      path === group.href || group.children.some((ch) => ch.href === path) ? 'bg-red-50 text-brand-red' : 'text-brand-blue hover:bg-slate-50'
                    }`}
                  >
                    {group.label} <i class="fa-solid fa-chevron-down text-xs"></i>
                  </button>
                  <div id={`mg-${gi}`} class="mobile-submenu pl-4">
                    {group.children.map((child) => (
                      <a href={child.href} class={`block px-3 py-2.5 rounded-lg text-sm font-semibold ${path === child.href ? 'text-brand-red' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <i class={`fa-solid ${child.icon} w-5 text-brand-red/70`}></i> {child.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a
                  href={group.href}
                  class={`px-3 py-3 rounded-lg text-base font-semibold ${
                    path === group.href ? 'bg-red-50 text-brand-red' : 'text-brand-blue hover:bg-slate-50'
                  }`}
                >
                  {group.label}
                </a>
              )
            )}
            <a href="/reviews" class={`px-3 py-3 rounded-lg text-base font-semibold ${path === '/reviews' ? 'bg-red-50 text-brand-red' : 'text-brand-blue hover:bg-slate-50'}`}>Reviews</a>
            <a href="/news" class={`px-3 py-3 rounded-lg text-base font-semibold ${path === '/news' ? 'bg-red-50 text-brand-red' : 'text-brand-blue hover:bg-slate-50'}`}>News</a>
          </nav>
          <div class="mt-auto p-5 border-t border-slate-100 flex flex-col gap-3">
            <a
              href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
              class="inline-flex items-center justify-center gap-2 border-2 border-brand-blue text-brand-blue font-bold py-3 rounded-full"
            >
              <i class="fa-solid fa-phone"></i> Call Us
            </a>
            <a href="/register" class="inline-flex items-center justify-center gap-2 bg-brand-red text-white font-bold py-3 rounded-full">
              <i class="fa-solid fa-user-plus"></i> Register Free
            </a>
          </div>
        </div>
        <div id="mobile-nav-backdrop" class="fixed inset-0 bg-black/40 z-40 hidden xl:hidden"></div>

        <main id="main-content">{children}</main>

        <footer class="bg-brand-bluedark text-slate-200 mt-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
            <div>
              <img src="/static/images/logo.png" alt={settings.business_name} class="h-16 w-auto mb-4 bg-white rounded-lg p-1" />
              <p class="text-sm text-slate-400 leading-relaxed">
                Your trusted partner in Bagha Purana (Moga) since {settings.founded_year || '2018'} for IELTS/PTE coaching, study abroad guidance, education loans, and visa services.
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
                {['canada', 'uk', 'australia', 'usa', 'new-zealand', 'germany'].map((slug) => (
                  <li>
                    <a href={`/study-abroad/${slug}`} class="text-slate-400 hover:text-white transition-colors capitalize">
                      Study in{' '}
                      {slug === 'uk' || slug === 'usa'
                        ? slug.toUpperCase()
                        : slug
                            .split('-')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(' ')}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="/score-charts" class="text-slate-400 hover:text-white transition-colors">
                    IELTS/PTE Score Charts
                  </a>
                </li>
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

        {/* Dismissible welcome popup (admin-configurable via Settings).
            Shown only ONCE EVER per browser (localStorage-gated — see
            app.js), closable via X / No Thanks / backdrop / Esc. */}
        {settings.popup_enabled === '1' && settings.popup_title ? (
          <div id="welcome-popup-backdrop" class="fixed inset-0 bg-black/60 z-[60] hidden items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="welcome-popup-title">
            <div class="popup-anim relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
              <button id="welcome-popup-close" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center" aria-label="Close popup">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
              <div class="w-14 h-14 rounded-xl bg-red-50 text-brand-red flex items-center justify-center mb-4">
                <i class="fa-solid fa-earth-asia text-2xl"></i>
              </div>
              <h2 id="welcome-popup-title" class="font-display text-xl sm:text-2xl font-extrabold text-brand-blue mb-2">
                {settings.popup_title}
              </h2>
              <p class="text-slate-500 text-sm leading-relaxed mb-6">{settings.popup_text}</p>
              <div class="flex flex-col sm:flex-row gap-3">
                <a
                  href={settings.popup_cta_link || '/register'}
                  class="flex-1 inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold py-3 rounded-full transition-colors"
                >
                  <i class="fa-solid fa-paper-plane"></i> {settings.popup_cta_text || 'Get Started'}
                </a>
                <button id="welcome-popup-dismiss" type="button" class="flex-1 inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-500 font-semibold py-3 rounded-full hover:bg-slate-50 transition-colors">
                  No Thanks
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ================================================================
            GLOBAL ENQUIRY MODAL — every "Enquire Now" / "Get Free
            Consultation" button across the site (data-open-enquiry)
            opens THIS one shared dialog instead of each page embedding
            its own inline form. Keeps pages clean while still routing
            every lead to /api/enquiry → D1 → admin inbox. The button's
            data-service / data-country / data-message attributes pre-fill
            the relevant fields.
            ================================================================ */}
        <dialog id="global-enquiry-modal" class="rounded-2xl p-0 w-[95vw] max-w-lg backdrop:bg-black/60 m-auto">
          <div class="p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
            <button data-close-modal type="button" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 z-10" aria-label="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
            <EnquiryForm settings={settings} idPrefix="gmodal" heading="Get Your Free Consultation" subheading="Fill this quick form — our counsellor will call you shortly." compact />
          </div>
        </dialog>

        <script src="/static/js/app.js"></script>
      </body>
    </html>
  )
})
