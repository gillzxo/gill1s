// =====================================================================
// Coaching page — IELTS/PTE batches, fees, faculty, demo booking, and
// a live Results section pulled from the coaching_results table.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, CoachingResult } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero, SectionHeading } from '../components/shared'

const coaching = new Hono<{ Bindings: Bindings }>()

const COURSES = [
  {
    name: 'IELTS (Academic & General)',
    duration: '4-8 Weeks',
    batches: 'Morning / Evening / Weekend',
    fee: '₹6,999 onwards',
    desc: 'Comprehensive training across Listening, Reading, Writing & Speaking with weekly mock tests.'
  },
  {
    name: 'PTE Academic',
    duration: '3-6 Weeks',
    batches: 'Morning / Evening / Weekend',
    fee: '₹5,999 onwards',
    desc: "AI-scored practice tests and strategy sessions tailored to PTE's unique question types."
  },
  {
    name: 'CELPIP',
    duration: '3-5 Weeks',
    batches: 'Evening / Weekend',
    fee: '₹5,499 onwards',
    desc: 'Canada-focused English test prep with Canadian-context listening & speaking practice.'
  },
  {
    name: 'Spoken English Foundation',
    duration: '6 Weeks',
    batches: 'Morning / Evening',
    fee: '₹3,999 onwards',
    desc: 'Build everyday fluency and confidence before jumping into exam-focused coaching.'
  }
]

const FACULTY = [
  { name: 'Ms. Ravneet Kaur', role: 'IELTS Trainer (10+ yrs)', icon: 'fa-chalkboard-user' },
  { name: 'Mr. Gurpreet Singh', role: 'PTE & CELPIP Specialist', icon: 'fa-chalkboard-user' },
  { name: 'Ms. Simran Dhillon', role: 'Spoken English Coach', icon: 'fa-chalkboard-user' }
]

coaching.get('/coaching', async (c) => {
  const settings = c.get('settings')

  const resultsRes = await c.env.DB.prepare(
    'SELECT * FROM coaching_results WHERE is_published = 1 ORDER BY sort_order ASC, overall_band DESC LIMIT 12'
  ).all<CoachingResult>()
  const results = resultsRes.results || []

  return c.render(
    <>
      <PageHero
        title="IELTS, PTE & Spoken English Coaching"
        subtitle="Small batches, experienced faculty, and a results-driven teaching method — right here in Ludhiana."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Coaching' }]}
      />

      {/* Courses */}
      <section class="py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Our Courses" title="Choose the Right Course for You" />
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COURSES.map((course) => (
              <div class="card-lift reveal bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col">
                <h3 class="font-display font-bold text-lg text-brand-blue mb-2">{course.name}</h3>
                <p class="text-slate-500 text-sm leading-relaxed mb-4 flex-1">{course.desc}</p>
                <dl class="text-sm space-y-1.5 border-t border-slate-100 pt-4">
                  <div class="flex justify-between">
                    <dt class="text-slate-400">Duration</dt>
                    <dd class="font-semibold text-slate-700">{course.duration}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-slate-400">Batches</dt>
                    <dd class="font-semibold text-slate-700 text-right">{course.batches}</dd>
                  </div>
                  <div class="flex justify-between">
                    <dt class="text-slate-400">Fee</dt>
                    <dd class="font-bold text-brand-red">{course.fee}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty */}
      <section class="py-20 bg-slate-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Meet the Team" title="Learn From Experienced Faculty" />
          <div class="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {FACULTY.map((f) => (
              <div class="reveal text-center bg-white rounded-2xl p-7 border border-slate-100 shadow-sm">
                <div class="w-20 h-20 rounded-full bg-red-50 text-brand-red flex items-center justify-center mx-auto mb-4">
                  <i class={`fa-solid ${f.icon} text-3xl`}></i>
                </div>
                <h3 class="font-display font-bold text-brand-blue">{f.name}</h3>
                <p class="text-slate-500 text-sm mt-1">{f.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      {results.length > 0 ? (
        <section class="py-20">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Proven Results" title="Our Students' Band Scores" subtitle="Real scores from real students who trained with us." />
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {results.map((r) => (
                <div class="card-lift reveal bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm text-center">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt={r.student_name} class="w-full aspect-square object-cover" loading="lazy" width="200" height="200" />
                  ) : (
                    <div class="w-full aspect-square bg-gradient-to-br from-brand-blue to-brand-bluelight flex items-center justify-center text-white text-4xl font-display font-bold">
                      {r.student_name.charAt(0)}
                    </div>
                  )}
                  <div class="p-4">
                    <p class="font-display font-bold text-brand-blue truncate">{r.student_name}</p>
                    <p class="text-xs text-slate-400 mb-2">{r.exam_type} · {r.batch || '-'}</p>
                    <div class="inline-flex items-center gap-1 bg-red-50 text-brand-red font-extrabold text-xl px-4 py-1.5 rounded-full">
                      {r.overall_band}
                    </div>
                    {r.listening || r.reading || r.writing || r.speaking ? (
                      <div class="grid grid-cols-4 gap-1 mt-3 text-[10px] text-slate-400">
                        <div>
                          <p class="font-bold text-slate-600">{r.listening ?? '-'}</p>L
                        </div>
                        <div>
                          <p class="font-bold text-slate-600">{r.reading ?? '-'}</p>R
                        </div>
                        <div>
                          <p class="font-bold text-slate-600">{r.writing ?? '-'}</p>W
                        </div>
                        <div>
                          <p class="font-bold text-slate-600">{r.speaking ?? '-'}</p>S
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Demo class booking */}
      <section class="py-20 bg-brand-blue">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-brand-blue mb-4">Book a Free Demo Class</h2>
              <p class="text-slate-500 mb-6">
                Experience our teaching style before you enrol. Fill the form and our team will schedule your free
                demo class at a convenient time.
              </p>
              <ul class="space-y-3 text-sm text-slate-600">
                {['No obligation, completely free', 'Meet our expert trainers', 'Get a personalised study plan'].map((item) => (
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-brand-red"></i> {item}
                  </li>
                ))}
              </ul>
            </div>
            <EnquiryForm settings={settings} idPrefix="coaching" defaultService="Coaching" compact />
          </div>
        </div>
      </section>
    </>,
    {
      title: 'IELTS & PTE Coaching',
      description: `Join ${settings.business_name} in Ludhiana for expert IELTS, PTE, and CELPIP coaching with proven band-score results. Book a free demo class today.`
    }
  )
})

export default coaching
