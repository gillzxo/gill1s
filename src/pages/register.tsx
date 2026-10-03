// =====================================================================
// Standalone Registration page — a dedicated, full-page registration
// form (distinct from the inline EnquiryForm used elsewhere), designed
// to look great and work well on mobile, tablet, and desktop. Submits
// to the same /api/enquiry endpoint so it lands in the same Admin →
// Enquiries inbox as every other lead source.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { Breadcrumbs } from '../components/shared'

const registerPage = new Hono<{ Bindings: Bindings }>()

const TRUST_POINTS = [
  { icon: 'fa-shield-heart', text: '100% free, no-obligation registration' },
  { icon: 'fa-user-clock', text: 'Our counsellor calls you within minutes' },
  { icon: 'fa-lock', text: 'Your details stay 100% confidential' }
]

registerPage.get('/register', async (c) => {
  const settings = c.get('settings')

  return c.render(
    <section class="min-h-screen hero-gradient py-10 sm:py-16">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-6 text-slate-300">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Register' }]} />
        </div>

        <div class="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left: pitch + trust points (hidden stacking handled responsively) */}
          <div class="lg:col-span-2 text-white order-2 lg:order-1">
            <span class="inline-flex items-center gap-2 bg-white/10 text-xs font-bold tracking-wide uppercase px-4 py-2 rounded-full mb-5">
              <i class="fa-solid fa-user-plus text-amber-400"></i> Free Registration
            </span>
            <h1 class="font-display text-3xl sm:text-4xl font-extrabold leading-tight mb-4">
              Register Now for Your Free IELTS/PTE &amp; Study Abroad Assessment
            </h1>
            <p class="text-slate-300 text-base sm:text-lg mb-8">
              Fill in your details below. One of our counsellors at {settings.branch_name || settings.business_name} will
              call you to understand your goals and recommend the right course, country, and visa pathway.
            </p>
            <ul class="space-y-4">
              {TRUST_POINTS.map((p) => (
                <li class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <i class={`fa-solid ${p.icon} text-amber-400`}></i>
                  </div>
                  <span class="text-slate-200 text-sm sm:text-base">{p.text}</span>
                </li>
              ))}
            </ul>

            <div class="mt-10 hidden lg:flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
              <img
                src={settings.md_photo_url || '/static/images/director-gurpiar-singh-gill.jpg'}
                alt={settings.md_name}
                class="w-14 h-14 rounded-full object-cover"
                width="56"
                height="56"
                loading="lazy"
              />
              <p class="text-sm text-slate-300 leading-relaxed">
                &ldquo;Every registration is personally reviewed by our team — we'll give you an honest assessment,
                not just a sales pitch.&rdquo;
                <span class="block text-white font-semibold mt-1">— {settings.md_name}, {settings.md_title}</span>
              </p>
            </div>
          </div>

          {/* Right: the form card — full width on mobile/tablet, sticky on desktop */}
          <div class="lg:col-span-3 order-1 lg:order-2">
            <div class="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 md:p-10">
              <EnquiryForm
                settings={settings}
                idPrefix="register"
                heading="Student Registration Form"
                subheading="Takes less than a minute. All fields marked * are required."
              />
            </div>
          </div>
        </div>
      </div>
    </section>,
    {
      title: 'Register for Free Consultation',
      description: `Register now for a free IELTS/PTE and study-abroad assessment with ${settings.business_name}. Quick registration form — our counsellor will call you shortly.`
    }
  )
})

export default registerPage
