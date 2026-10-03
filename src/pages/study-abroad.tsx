// =====================================================================
// Study Abroad — country overview grid + individual country pages
// (data-driven from the `countries` table, fully editable in admin).
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Country } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero, SectionHeading } from '../components/shared'

const studyAbroad = new Hono<{ Bindings: Bindings }>()

studyAbroad.get('/study-abroad', async (c) => {
  const settings = c.get('settings')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM countries WHERE is_published = 1 ORDER BY sort_order ASC'
  ).all<Country>()
  const allCountries = results || []

  // Non-Europe destinations show as top-level cards; Europe countries are
  // grouped under a single "Europe" card so students pick the region first,
  // then the specific country.
  const standaloneCountries = allCountries.filter((ctry) => ctry.region !== 'Europe')
  const europeCountries = allCountries.filter((ctry) => ctry.region === 'Europe')

  return c.render(
    <>
      <PageHero
        title="Study Abroad — Choose Your Destination"
        subtitle="Country-wise guidance on universities, intakes, fees, eligibility, and PR pathways."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Study Abroad' }]}
      />

      <section class="py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Popular Destinations" title="Explore Study Destinations" />
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {standaloneCountries.map((country) => (
              <a href={`/study-abroad/${country.slug}`} class="card-lift reveal bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm block">
                <div class="h-40 bg-gradient-to-br from-brand-blue to-brand-bluelight flex items-center justify-center text-6xl">
                  {country.flag_emoji}
                </div>
                <div class="p-6">
                  <h3 class="font-display font-bold text-xl text-brand-blue mb-2">Study in {country.name}</h3>
                  <p class="text-slate-500 text-sm line-clamp-3 mb-4">{country.intro}</p>
                  <span class="inline-flex items-center gap-1 text-brand-red font-semibold text-sm">
                    View Details <i class="fa-solid fa-arrow-right text-xs"></i>
                  </span>
                </div>
              </a>
            ))}

            {/* Europe — grouped card. Click reveals a dropdown of specific countries. */}
            {europeCountries.length > 0 ? (
              <div class="card-lift reveal bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm relative" id="europe-card">
                <div class="h-40 bg-gradient-to-br from-brand-blue to-brand-bluelight flex items-center justify-center text-6xl">
                  🇪🇺
                </div>
                <div class="p-6">
                  <h3 class="font-display font-bold text-xl text-brand-blue mb-2">Study in Europe</h3>
                  <p class="text-slate-500 text-sm mb-4">
                    {europeCountries.length} popular European destinations — pick a country to see universities, fees &amp; visa details.
                  </p>
                  <label htmlFor="europe-country-select" class="sr-only">
                    Select a European country
                  </label>
                  <select
                    id="europe-country-select"
                    class="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-brand-blue focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
                    data-europe-select
                  >
                    <option value="">Select a country...</option>
                    {europeCountries.map((c2) => (
                      <option value={`/study-abroad/${c2.slug}`}>
                        {c2.flag_emoji} {c2.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('[data-europe-select]').forEach(function (sel) {
              sel.addEventListener('change', function () {
                if (sel.value) window.location.href = sel.value;
              });
            });
          `
        }}
      ></script>

      <section class="py-20 bg-slate-50">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white rounded-2xl shadow-xl p-6 sm:p-10">
            <EnquiryForm settings={settings} idPrefix="sa-overview" defaultService="Study Abroad" heading="Not Sure Which Country Is Right for You?" subheading="Talk to our expert counsellors — free of cost." />
          </div>
        </div>
      </section>
    </>,
    {
      title: 'Study Abroad',
      description: `Explore study abroad options in Canada, UK, Australia, USA, New Zealand, and Europe (Germany, Ireland, France, Poland) with ${settings.business_name}. Universities, intakes, fees, eligibility & PR pathways.`
    }
  )
})

studyAbroad.get('/study-abroad/:slug', async (c) => {
  const settings = c.get('settings')
  const slug = c.req.param('slug')

  const country = await c.env.DB.prepare('SELECT * FROM countries WHERE slug = ? AND is_published = 1')
    .bind(slug)
    .first<Country>()

  if (!country) return c.notFound()

  const universities: { name: string; location: string; ranking: string }[] = safeParse(country.universities_json, [])
  const documents: string[] = safeParse(country.documents_json, [])

  return c.render(
    <>
      <PageHero
        title={`Study in ${country.name} ${country.flag_emoji || ''}`}
        subtitle={country.intro || undefined}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Study Abroad', href: '/study-abroad' }, { label: country.name }]}
      />

      <section class="py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-3 gap-12">
          <div class="lg:col-span-2 space-y-12">
            {/* Key Facts */}
            <div class="grid sm:grid-cols-2 gap-5">
              <InfoCard icon="fa-calendar-days" label="Intakes" value={country.intakes} />
              <InfoCard icon="fa-sack-dollar" label="Average Fees" value={country.avg_fees} />
              <InfoCard icon="fa-clipboard-check" label="Eligibility" value={country.eligibility} />
              <InfoCard icon="fa-briefcase" label="Work Rights" value={country.work_rights} />
            </div>

            {/* PR Pathway */}
            {country.pr_pathway ? (
              <div class="reveal bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <h3 class="font-display font-bold text-brand-blue text-lg mb-2 flex items-center gap-2">
                  <i class="fa-solid fa-route text-brand-red"></i> Pathway to PR
                </h3>
                <p class="text-slate-600 text-sm leading-relaxed">{country.pr_pathway}</p>
              </div>
            ) : null}

            {/* Universities */}
            {universities.length > 0 ? (
              <div class="reveal">
                <h3 class="font-display font-bold text-brand-blue text-xl mb-5">Popular Universities &amp; Colleges</h3>
                <div class="grid sm:grid-cols-2 gap-4">
                  {universities.map((u) => (
                    <div class="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                      <p class="font-bold text-slate-800">{u.name}</p>
                      <p class="text-slate-400 text-sm mt-1">
                        <i class="fa-solid fa-location-dot mr-1"></i> {u.location}
                      </p>
                      <p class="text-brand-red text-xs font-semibold mt-2">{u.ranking}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Documents */}
            {documents.length > 0 ? (
              <div class="reveal">
                <h3 class="font-display font-bold text-brand-blue text-xl mb-5">Required Documents</h3>
                <ul class="grid sm:grid-cols-2 gap-3">
                  {documents.map((doc) => (
                    <li class="flex items-start gap-2 text-sm text-slate-600 bg-white border border-slate-100 rounded-lg px-4 py-3">
                      <i class="fa-solid fa-file-circle-check text-brand-red mt-0.5"></i> {doc}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* CTA */}
            <div class="reveal bg-brand-blue rounded-2xl p-8 text-center">
              <h3 class="font-display text-xl sm:text-2xl font-extrabold text-white mb-3">
                Ready to Begin Your {country.name} Journey?
              </h3>
              <p class="text-slate-300 mb-6">Book a free consultation with our {country.name} specialists today.</p>
              <a href="#enquiry" class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-7 py-3.5 rounded-full transition-colors">
                <i class="fa-solid fa-calendar-check"></i> Free Consultation
              </a>
            </div>
          </div>

          {/* Sticky enquiry sidebar */}
          <div class="lg:col-span-1">
            <div id="enquiry" class="sticky top-28 bg-white rounded-2xl shadow-xl border border-slate-100 p-6 scroll-mt-28">
              <EnquiryForm
                settings={settings}
                idPrefix="country"
                defaultService="Study Abroad"
                heading={`Enquire About ${country.name}`}
                compact
              />
            </div>
          </div>
        </div>
      </section>
    </>,
    {
      title: `Study in ${country.name}`,
      description: country.intro || `Study in ${country.name} with expert guidance from ${settings.business_name}. Universities, fees, eligibility, and visa support.`
    }
  )
})

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null
  return (
    <div class="reveal bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
      <div class="flex items-center gap-2 text-brand-red mb-2">
        <i class={`fa-solid ${icon}`}></i>
        <span class="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p class="text-slate-700 text-sm leading-relaxed">{value}</p>
    </div>
  )
}

function safeParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export default studyAbroad
