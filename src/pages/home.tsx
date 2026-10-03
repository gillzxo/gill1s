// =====================================================================
// Home page
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, VisaResult, Review, NewsPost } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { SectionHeading, StatCounter, StarRating } from '../components/shared'
import { whatsappLink } from '../lib/settings'

const home = new Hono<{ Bindings: Bindings }>()

const SERVICES = [
  {
    icon: 'fa-headset',
    title: 'IELTS / PTE Coaching',
    desc: 'Expert-led batches for IELTS, PTE, CELPIP & more with proven band-score results.',
    href: '/coaching'
  },
  {
    icon: 'fa-earth-asia',
    title: 'Study Abroad Guidance',
    desc: 'End-to-end counselling for Canada, UK, Australia, USA, Germany & more.',
    href: '/study-abroad'
  },
  {
    icon: 'fa-hand-holding-dollar',
    title: 'Education Loan Assistance',
    desc: 'Free EMI & eligibility calculators plus hands-on loan paperwork support.',
    href: '/education-loan'
  },
  {
    icon: 'fa-passport',
    title: 'Visa Services',
    desc: 'Document checklists, SOPs, and interview preparation for a smooth visa approval.',
    href: '/visa-results'
  }
]

home.get('/', async (c) => {
  const settings = c.get('settings')

  const [visaResultsRes, reviewsRes, newsRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM visa_results WHERE is_published = 1 ORDER BY sort_order ASC, id DESC LIMIT 8').all<VisaResult>(),
    c.env.DB.prepare('SELECT * FROM reviews WHERE is_visible = 1 ORDER BY sort_order ASC, id DESC LIMIT 6').all<Review>(),
    c.env.DB.prepare("SELECT * FROM news_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 3").all<NewsPost>()
  ])

  const visaResults = visaResultsRes.results || []
  const reviews = reviewsRes.results || []
  const newsPosts = newsRes.results || []

  const waLink = whatsappLink(settings.whatsapp_number, 'Hi! I would like a free consultation.')
  const foundedYear = parseInt(settings.founded_year) || 2018
  const currentYear = new Date().getFullYear()
  const yearsOfExperience = Math.max(currentYear - foundedYear, parseInt(settings.stat_years_experience) || 0)

  return c.render(
    <>
      {/* ================= HERO ================= */}
      <section class="hero-gradient relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
        <div class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_80%_20%,white,transparent_35%)]"></div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span class="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold tracking-wide uppercase px-4 py-2 rounded-full mb-6">
              <i class="fa-solid fa-star text-amber-400"></i> Bagha Purana's Trusted Immigration Partner Since {settings.founded_year || '2018'}
            </span>
            <h1 class="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1]">
              Your Journey to <span class="text-brand-red">Study & Settle Abroad</span> Starts Here
            </h1>
            <p class="text-slate-300 text-lg mt-6 max-w-xl">
              IELTS/PTE coaching, study abroad counselling, education loan assistance, and visa services — all under
              one roof in Bagha Purana, Moga, Punjab.
            </p>
            <div class="flex flex-wrap gap-4 mt-8">
              <a
                href="#enquiry"
                class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-7 py-4 rounded-full shadow-xl shadow-red-900/30 transition-transform hover:-translate-y-0.5"
              >
                <i class="fa-solid fa-calendar-check"></i> Free Consultation
              </a>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-4 rounded-full border border-white/20 transition-colors"
              >
                <i class="fa-brands fa-whatsapp text-xl"></i> Chat on WhatsApp
              </a>
            </div>
            <div class="flex items-center gap-6 mt-10">
              <div class="flex items-center gap-2">
                <StarRating rating={5} />
                <span class="text-white font-bold">{settings.google_rating}</span>
              </div>
              <span class="text-slate-400 text-sm">from {settings.google_review_count}+ Google Reviews</span>
            </div>
          </div>

          <div id="enquiry" class="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 scroll-mt-24">
            <EnquiryForm settings={settings} idPrefix="hero" heading="Book Your Free Consultation" subheading="Our counsellors respond within minutes." />
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section class="bg-brand-blue py-14">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          <StatCounter value={parseInt(settings.stat_students_placed) || 0} label="Students Placed" icon="fa-user-graduate" />
          <StatCounter value={parseInt(settings.stat_visas_approved) || 0} label="Visas Approved" icon="fa-passport" />
          <StatCounter value={yearsOfExperience} label={`Years of Experience (Since ${settings.founded_year || '2018'})`} icon="fa-award" />
          <StatCounter value={parseInt(settings.stat_countries) || 0} label="Study Destinations" icon="fa-earth-americas" />
        </div>
      </section>

      {/* ================= MANAGING DIRECTOR ================= */}
      <section class="py-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="reveal grid md:grid-cols-5 gap-10 items-center bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-100">
            <div class="md:col-span-2 flex justify-center">
              <img
                src={settings.md_photo_url || '/static/images/director-gurpiar-singh-gill.jpg'}
                alt={`${settings.md_name} — ${settings.md_title}, ${settings.business_name}`}
                class="w-52 h-72 sm:w-60 sm:h-[22rem] rounded-2xl object-cover object-top shadow-xl"
                width="240"
                height="352"
                loading="lazy"
              />
            </div>
            <div class="md:col-span-3">
              <span class="inline-block text-xs font-bold tracking-widest uppercase text-brand-red bg-red-50 px-3 py-1 rounded-full mb-3">
                A Message From Our Managing Director
              </span>
              <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-brand-blue mb-1">{settings.md_name}</h2>
              <p class="text-brand-red font-semibold text-sm mb-4">{settings.md_title}, {settings.branch_name || settings.business_name}</p>
              <p class="text-slate-600 leading-relaxed">{settings.md_bio}</p>
              <div class="flex flex-wrap gap-4 mt-6">
                <a href="#enquiry" class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-6 py-3 rounded-full transition-colors">
                  <i class="fa-solid fa-calendar-check"></i> Talk to Our Team
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section class="py-20 bg-slate-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What We Offer" title="Everything You Need, Under One Roof" subtitle="From your first IELTS class to landing in your dream country — we're with you at every step." />
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((s) => (
              <a href={s.href} class="card-lift reveal bg-white rounded-2xl p-7 shadow-sm border border-slate-100 block">
                <div class="w-14 h-14 rounded-xl bg-red-50 text-brand-red flex items-center justify-center mb-5">
                  <i class={`fa-solid ${s.icon} text-2xl`}></i>
                </div>
                <h3 class="font-display font-bold text-lg text-brand-blue mb-2">{s.title}</h3>
                <p class="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                <span class="inline-flex items-center gap-1 text-brand-red text-sm font-semibold mt-4">
                  Learn more <i class="fa-solid fa-arrow-right text-xs"></i>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ================= VISA RESULTS ================= */}
      {visaResults.length > 0 ? (
        <section class="py-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Proven Success" title="Our Latest Visa Approvals" subtitle="Real students, real results. Browse our full gallery for more." />
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-5">
              {visaResults.map((v) => (
                <div class="card-lift reveal rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white">
                  <img src={v.image_url} alt={`${v.student_name} - ${v.country} ${v.visa_type} approved`} class="w-full aspect-[3/4] object-cover" loading="lazy" width="300" height="400" />
                  <div class="p-3">
                    <p class="font-bold text-brand-blue text-sm truncate">{v.student_name}</p>
                    <p class="text-xs text-slate-400">
                      {v.country} · {v.visa_type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div class="text-center mt-10">
              <a href="/visa-results" class="inline-flex items-center gap-2 border-2 border-brand-blue text-brand-blue font-bold px-7 py-3.5 rounded-full hover:bg-brand-blue hover:text-white transition-colors">
                View All Visa Results <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= REVIEWS STRIP ================= */}
      {reviews.length > 0 ? (
        <section class="py-20 bg-brand-blue">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12 reveal">
              <span class="inline-block text-xs font-bold tracking-widest uppercase text-brand-red bg-white px-3 py-1 rounded-full mb-3">
                Testimonials
              </span>
              <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-white">What Our Students Say</h2>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((r) => (
                <div class="reveal bg-white/5 border border-white/10 rounded-2xl p-6">
                  <StarRating rating={r.rating} />
                  <p class="text-slate-200 text-sm mt-4 leading-relaxed">&ldquo;{r.review_text}&rdquo;</p>
                  <p class="text-white font-bold mt-4">{r.author_name}</p>
                </div>
              ))}
            </div>
            <div class="text-center mt-10">
              <a href="/reviews" class="inline-flex items-center gap-2 bg-white text-brand-blue font-bold px-7 py-3.5 rounded-full hover:bg-slate-100 transition-colors">
                Read All Reviews <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= NEWS ================= */}
      {newsPosts.length > 0 ? (
        <section class="py-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Stay Informed" title="Latest Immigration Updates" subtitle="Keep up with visa rule changes, intakes, and country-specific news." />
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsPosts.map((post) => (
                <a href={`/news/${post.slug}`} class="card-lift reveal block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} class="w-full h-44 object-cover" loading="lazy" width="400" height="176" />
                  ) : (
                    <div class="w-full h-44 bg-gradient-to-br from-brand-blue to-brand-bluelight flex items-center justify-center text-white font-display font-bold text-xl">
                      {post.category}
                    </div>
                  )}
                  <div class="p-5">
                    <span class="text-xs font-bold text-brand-red uppercase tracking-wide">{post.category}</span>
                    <h3 class="font-display font-bold text-brand-blue mt-2 leading-snug line-clamp-2">{post.title}</h3>
                    <p class="text-slate-500 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ================= FINAL CTA ================= */}
      <section class="py-20 bg-slate-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 class="font-display text-3xl sm:text-4xl font-extrabold text-brand-blue mb-4">Ready to Start Your Journey?</h2>
          <p class="text-slate-500 text-lg mb-8">Book a free, no-obligation consultation with our expert counsellors today.</p>
          <div class="flex flex-wrap justify-center gap-4">
            <a href="#enquiry" class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-8 py-4 rounded-full shadow-lg transition-colors">
              <i class="fa-solid fa-calendar-check"></i> Book Free Consultation
            </a>
            <a href={`tel:${settings.phone_primary.replace(/\s/g, '')}`} class="inline-flex items-center gap-2 border-2 border-brand-blue text-brand-blue font-bold px-8 py-4 rounded-full hover:bg-brand-blue hover:text-white transition-colors">
              <i class="fa-solid fa-phone"></i> {settings.phone_primary}
            </a>
          </div>
        </div>
      </section>
    </>,
    { title: 'Home', description: `${settings.business_name} — Expert IELTS/PTE coaching, study abroad guidance, education loan assistance, and visa services in Bagha Purana, Moga, Punjab.` }
  )
})

export default home
