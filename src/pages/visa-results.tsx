// =====================================================================
// Visa Results — filterable gallery (country + visa type) with a
// lightbox view. Lazy-loaded images, fully keyboard accessible lightbox.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, VisaResult } from '../lib/types'
import { PageHero, SectionHeading } from '../components/shared'

const visaResultsPage = new Hono<{ Bindings: Bindings }>()

visaResultsPage.get('/visa-results', async (c) => {
  const settings = c.get('settings')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM visa_results WHERE is_published = 1 ORDER BY sort_order ASC, id DESC'
  ).all<VisaResult>()
  const visaResults = results || []

  const countries = Array.from(new Set(visaResults.map((v) => v.country))).sort()
  const visaTypes = Array.from(new Set(visaResults.map((v) => v.visa_type))).sort()

  return c.render(
    <>
      <PageHero
        title="Our Visa Approval Gallery"
        subtitle={`${visaResults.length}+ successful visa approvals and counting. Filter by country or visa type to see real results.`}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Visa Results' }]}
      />

      <section class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div class="flex flex-wrap gap-4 mb-10 reveal" role="group" aria-label="Filter visa results">
            <select id="filter-country" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white">
              <option value="">All Countries</option>
              {countries.map((ctry) => (
                <option value={ctry}>{ctry}</option>
              ))}
            </select>
            <select id="filter-type" class="px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white">
              <option value="">All Visa Types</option>
              {visaTypes.map((t) => (
                <option value={t}>{t}</option>
              ))}
            </select>
            <span id="filter-count" class="ml-auto self-center text-sm text-slate-400">
              {visaResults.length} results
            </span>
          </div>

          {/* Gallery grid */}
          <div id="visa-gallery" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {visaResults.map((v, i) => (
              <button
                type="button"
                class="visa-card card-lift reveal rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-white text-left"
                data-country={v.country}
                data-type={v.visa_type}
                data-index={i}
              >
                <img
                  src={v.image_url}
                  alt={`${v.student_name} - ${v.country} ${v.visa_type} approved`}
                  class="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                  width="300"
                  height="400"
                />
                <div class="p-3">
                  <p class="font-bold text-brand-blue text-sm truncate">{v.student_name}</p>
                  <p class="text-xs text-slate-400">
                    {v.country} · {v.visa_type}
                  </p>
                  {v.visa_date ? <p class="text-[10px] text-slate-300 mt-0.5">{v.visa_date}</p> : null}
                </div>
              </button>
            ))}
          </div>

          <div id="no-results" class="hidden text-center py-20 text-slate-400">
            <i class="fa-solid fa-filter-circle-xmark text-4xl mb-3"></i>
            <p>No results match your filters. Try a different combination.</p>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <div id="lightbox" class="lightbox-overlay hidden" role="dialog" aria-modal="true" aria-label="Visa result preview">
        <button id="lightbox-close" class="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Close preview">
          <i class="fa-solid fa-xmark text-2xl"></i>
        </button>
        <button id="lightbox-prev" class="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Previous">
          <i class="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <button id="lightbox-next" class="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20" aria-label="Next">
          <i class="fa-solid fa-chevron-right text-xl"></i>
        </button>
        <div class="max-w-lg w-full">
          <img id="lightbox-image" src="" alt="" class="w-full rounded-xl shadow-2xl max-h-[75vh] object-contain bg-white" />
          <div class="text-center mt-4">
            <p id="lightbox-name" class="text-white font-bold text-lg"></p>
            <p id="lightbox-meta" class="text-slate-300 text-sm"></p>
          </div>
        </div>
      </div>

      <section class="py-16 bg-slate-50">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-brand-blue mb-4">Your Visa Success Story Starts Here</h2>
          <p class="text-slate-500 mb-6">Join thousands of students who trusted {settings.business_name} with their study abroad dreams.</p>
          <a href="/contact" class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-7 py-3.5 rounded-full transition-colors">
            <i class="fa-solid fa-calendar-check"></i> Book Free Consultation
          </a>
        </div>
      </section>

      <script src="/static/js/visa-gallery.js"></script>
    </>,
    {
      title: 'Visa Results',
      description: `Browse ${visaResults.length}+ real visa approvals by ${settings.business_name} students across Canada, UK, Australia, USA & more.`
    }
  )
})

export default visaResultsPage
