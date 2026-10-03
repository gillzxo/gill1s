// =====================================================================
// IELTS / PTE Academic / PTE Core score charts + CLB mapping + an
// interactive cross-test score converter. Heavily SEO-optimised —
// this page is designed to rank for searches like "IELTS to CLB
// converter", "PTE to IELTS chart", "PTE Core CLB chart" and drive
// organic leads into the enquiry funnel.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero, SectionHeading } from '../components/shared'

const scoreChartsPage = new Hono<{ Bindings: Bindings }>()

// ---------------------------------------------------------------------
// IELTS band descriptors (General Training & Academic — band meaning is
// the same scale for both)
// ---------------------------------------------------------------------
const IELTS_BANDS = [
  { band: '9', level: 'Expert', desc: 'Full operational command of English. Appropriate, accurate and fluent.' },
  { band: '8', level: 'Very Good', desc: 'Fully operational command with only occasional inaccuracies.' },
  { band: '7', level: 'Good', desc: 'Operational command, generally handles complex language well.' },
  { band: '6', level: 'Competent', desc: 'Generally effective command despite some inaccuracies and misunderstandings.' },
  { band: '5', level: 'Modest', desc: 'Partial command, copes with overall meaning in most situations.' },
  { band: '4', level: 'Limited', desc: 'Basic competence limited to familiar situations.' },
  { band: '3', level: 'Extremely Limited', desc: 'Conveys/understands only general meaning in very familiar situations.' }
]

// ---------------------------------------------------------------------
// IELTS General Training → CLB (official IRCC mirror table)
// ---------------------------------------------------------------------
const IELTS_TO_CLB = [
  { clb: 10, reading: '8.0', writing: '7.5', listening: '8.5', speaking: '7.5' },
  { clb: 9, reading: '7.0', writing: '7.0', listening: '8.0', speaking: '7.0' },
  { clb: 8, reading: '6.5', writing: '6.5', listening: '7.5', speaking: '6.5' },
  { clb: 7, reading: '6.0', writing: '6.0', listening: '6.0', speaking: '6.0' },
  { clb: 6, reading: '5.0', writing: '5.5', listening: '5.5', speaking: '5.5' },
  { clb: 5, reading: '4.0', writing: '5.0', listening: '5.0', speaking: '5.0' },
  { clb: 4, reading: '3.5', writing: '4.0', listening: '4.5', speaking: '4.0' }
]

// ---------------------------------------------------------------------
// PTE Core → CLB (official Pearson table, Jan 2024)
// ---------------------------------------------------------------------
const PTE_CORE_TO_CLB = [
  { clb: 10, listening: '89-90', reading: '88-90', speaking: '89-90', writing: '90' },
  { clb: 9, listening: '82-88', reading: '78-87', speaking: '84-88', writing: '88-89' },
  { clb: 8, listening: '71-81', reading: '69-77', speaking: '76-83', writing: '79-87' },
  { clb: 7, listening: '60-70', reading: '60-68', speaking: '68-75', writing: '69-78' },
  { clb: 6, listening: '50-59', reading: '51-59', speaking: '59-67', writing: '60-68' },
  { clb: 5, listening: '39-49', reading: '42-50', speaking: '51-58', writing: '51-59' },
  { clb: 4, listening: '28-38', reading: '33-41', speaking: '42-50', writing: '41-50' },
  { clb: 3, listening: '18-27', reading: '24-32', speaking: '34-41', writing: '32-40' }
]

// ---------------------------------------------------------------------
// PTE Academic → IELTS concordance (official Pearson table, updated Jul 2025)
// ---------------------------------------------------------------------
const PTE_TO_IELTS = [
  { pte: 90, ielts: '9.0' },
  { pte: 86, ielts: '8.5' },
  { pte: 79, ielts: '8.0' },
  { pte: 71, ielts: '7.5' },
  { pte: 63, ielts: '7.0' },
  { pte: 55, ielts: '6.5' },
  { pte: 47, ielts: '6.0' },
  { pte: 39, ielts: '5.5' },
  { pte: 31, ielts: '5.0' },
  { pte: 24, ielts: '4.5' }
]

scoreChartsPage.get('/score-charts', async (c) => {
  const settings = c.get('settings')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What IELTS score is equal to CLB 7?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'IELTS General Training band 6.0 in Reading, 6.0 in Writing, 6.0 in Listening and 6.0 in Speaking equals CLB 7 — the minimum typically required for Express Entry and most Canadian PR programs.'
        }
      },
      {
        '@type': 'Question',
        name: 'What PTE Core score is equal to CLB 7?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'On PTE Core, Listening 60-70, Reading 60-68, Speaking 68-75 and Writing 69-78 each equal CLB 7. Your overall CLB for immigration purposes is the lowest of your four skill CLBs.'
        }
      },
      {
        '@type': 'Question',
        name: 'Is PTE Academic the same as PTE Core?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. PTE Academic (scored 10-90) is accepted for study visas and immigration to Australia, New Zealand and the UK and converts to an IELTS-equivalent score. PTE Core is a separate Pearson test designed specifically for Canadian immigration (Express Entry, PR, citizenship) and converts directly to CLB.'
        }
      }
    ]
  }

  return c.render(
    <>
      <PageHero
        title="IELTS, PTE & CLB Score Charts + Free Converter"
        subtitle="Official IELTS band descriptors, PTE Academic, and PTE Core → CLB conversion charts — plus an instant score converter tool."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Score Charts' }]}
      />

      {/* ================= CONVERTER TOOL ================= */}
      <section class="py-16">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Free Tool"
            title="Score Converter"
            subtitle="Enter your score in any one field — we'll instantly show you the equivalent IELTS, PTE Academic, and CLB level."
          />
          <div id="score-converter" class="reveal bg-white border border-slate-100 shadow-xl rounded-2xl p-6 sm:p-10">
            <div class="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="conv-ielts" class="block text-sm font-semibold text-slate-700 mb-1.5">
                  IELTS Overall Band (4.0 - 9.0)
                </label>
                <input
                  id="conv-ielts"
                  type="number"
                  step="0.5"
                  min="4"
                  max="9"
                  placeholder="e.g. 6.5"
                  data-converter-input="ielts"
                  class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="conv-pte" class="block text-sm font-semibold text-slate-700 mb-1.5">
                  PTE Academic Score (24 - 90)
                </label>
                <input
                  id="conv-pte"
                  type="number"
                  min="24"
                  max="90"
                  placeholder="e.g. 55"
                  data-converter-input="pte"
                  class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
                />
              </div>
            </div>

            <div id="converter-result" class="mt-6 hidden grid sm:grid-cols-3 gap-4 text-center">
              <div class="bg-blue-50 rounded-xl p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">IELTS Equivalent</p>
                <p id="result-ielts" class="text-2xl font-extrabold text-brand-blue mt-1">-</p>
              </div>
              <div class="bg-red-50 rounded-xl p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">PTE Academic Equivalent</p>
                <p id="result-pte" class="text-2xl font-extrabold text-brand-red mt-1">-</p>
              </div>
              <div class="bg-green-50 rounded-xl p-4">
                <p class="text-xs font-bold uppercase tracking-wide text-slate-500">Approx. CLB Level*</p>
                <p id="result-clb" class="text-2xl font-extrabold text-green-700 mt-1">-</p>
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-4">
              *CLB is officially calculated only from IELTS General Training or PTE Core (not PTE Academic). This is
              an approximate guide based on the IELTS↔PTE Academic concordance — always confirm your exact CLB using
              your official PTE Core or IELTS GT score card, or ask our counsellors to verify it for free.
            </p>
          </div>
        </div>
      </section>

      {/* ================= IELTS BAND DESCRIPTORS ================= */}
      <section class="py-16 bg-slate-50">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="IELTS" title="IELTS Band Score Descriptors" subtitle="What each overall band score means in terms of English proficiency." />
          <div class="overflow-x-auto reveal">
            <table class="w-full text-sm bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <thead class="bg-brand-blue text-white">
                <tr>
                  <th class="px-4 py-3 text-left">Band</th>
                  <th class="px-4 py-3 text-left">Level</th>
                  <th class="px-4 py-3 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {IELTS_BANDS.map((row, i) => (
                  <tr class={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td class="px-4 py-3 font-extrabold text-brand-red">{row.band}</td>
                    <td class="px-4 py-3 font-semibold text-slate-700">{row.level}</td>
                    <td class="px-4 py-3 text-slate-500">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ================= PTE ACADEMIC -> IELTS ================= */}
      <section class="py-16">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="PTE Academic" title="PTE Academic to IELTS Score Chart" subtitle="Official Pearson concordance table — use this to estimate your IELTS-equivalent score from a PTE Academic result." />
          <div class="overflow-x-auto reveal">
            <table class="w-full text-sm bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <thead class="bg-brand-blue text-white">
                <tr>
                  <th class="px-4 py-3 text-left">PTE Academic Score</th>
                  <th class="px-4 py-3 text-left">IELTS Equivalent Band</th>
                </tr>
              </thead>
              <tbody>
                {PTE_TO_IELTS.map((row, i) => (
                  <tr class={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td class="px-4 py-3 font-extrabold text-brand-red">{row.pte}</td>
                    <td class="px-4 py-3 font-semibold text-slate-700">{row.ielts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 mt-3">
            Source: Pearson PTE Academic Score Guide — official IELTS concordance, updated July 2025.
          </p>
        </div>
      </section>

      {/* ================= IELTS GT -> CLB ================= */}
      <section class="py-16 bg-slate-50">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Canada Immigration" title="IELTS General Training to CLB Chart" subtitle="The official IRCC chart used to calculate your Canadian Language Benchmark (CLB) level for Express Entry & PR." />
          <div class="overflow-x-auto reveal">
            <table class="w-full text-sm bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <thead class="bg-brand-blue text-white">
                <tr>
                  <th class="px-4 py-3 text-left">CLB Level</th>
                  <th class="px-4 py-3 text-left">Reading</th>
                  <th class="px-4 py-3 text-left">Writing</th>
                  <th class="px-4 py-3 text-left">Listening</th>
                  <th class="px-4 py-3 text-left">Speaking</th>
                </tr>
              </thead>
              <tbody>
                {IELTS_TO_CLB.map((row, i) => (
                  <tr class={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td class="px-4 py-3 font-extrabold text-brand-red">CLB {row.clb}</td>
                    <td class="px-4 py-3 text-slate-700">{row.reading}</td>
                    <td class="px-4 py-3 text-slate-700">{row.writing}</td>
                    <td class="px-4 py-3 text-slate-700">{row.listening}</td>
                    <td class="px-4 py-3 text-slate-700">{row.speaking}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 mt-3">
            Your overall CLB level is the <strong>lowest</strong> of your four skill-wise CLB scores — not an average.
          </p>
        </div>
      </section>

      {/* ================= PTE CORE -> CLB ================= */}
      <section class="py-16">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Canada Immigration" title="PTE Core to CLB Score Chart" subtitle="PTE Core is Pearson's dedicated test for Canadian immigration — this official chart converts each skill score directly to CLB." />
          <div class="overflow-x-auto reveal">
            <table class="w-full text-sm bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <thead class="bg-brand-blue text-white">
                <tr>
                  <th class="px-4 py-3 text-left">CLB Level</th>
                  <th class="px-4 py-3 text-left">Listening</th>
                  <th class="px-4 py-3 text-left">Reading</th>
                  <th class="px-4 py-3 text-left">Speaking</th>
                  <th class="px-4 py-3 text-left">Writing</th>
                </tr>
              </thead>
              <tbody>
                {PTE_CORE_TO_CLB.map((row, i) => (
                  <tr class={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td class="px-4 py-3 font-extrabold text-brand-red">CLB {row.clb}</td>
                    <td class="px-4 py-3 text-slate-700">{row.listening}</td>
                    <td class="px-4 py-3 text-slate-700">{row.reading}</td>
                    <td class="px-4 py-3 text-slate-700">{row.speaking}</td>
                    <td class="px-4 py-3 text-slate-700">{row.writing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-400 mt-3">
            Source: Pearson PTE Core Score Guide (official CLB conversion, Jan 2024 version). Note: PTE Core is a
            different exam from PTE Academic — it is used only for Canadian immigration (Express Entry, PR, citizenship),
            not for study visas.
          </p>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section class="py-16 bg-slate-50">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQs" title="Common Questions" />
          <div class="space-y-4">
            <FaqItem q="What IELTS score is equal to CLB 7?" a="IELTS General Training band 6.0 in each of Reading, Writing, Listening and Speaking equals CLB 7 — the minimum typically required for Express Entry and most Canadian PR programs." />
            <FaqItem q="What PTE Core score is equal to CLB 7?" a="On PTE Core: Listening 60-70, Reading 60-68, Speaking 68-75 and Writing 69-78 each equal CLB 7. Your overall CLB is the lowest of your four skill CLBs, not an average." />
            <FaqItem q="Is PTE Academic the same as PTE Core?" a="No. PTE Academic (scored 10-90) is accepted for study visas and immigration to Australia, New Zealand and the UK, and converts to an IELTS-equivalent score. PTE Core is a separate Pearson test built specifically for Canadian immigration and converts directly to CLB." />
            <FaqItem q="Which test should I take — IELTS or PTE?" a="It depends on your destination and comfort with computer-delivered tests. Canada PR applicants often prefer PTE Core for its fast AI-scored results; study visa applicants to the UK/Australia/NZ can choose either IELTS or PTE Academic. Talk to our counsellors for a personalised recommendation." />
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section class="py-20">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-brand-blue rounded-2xl shadow-2xl p-6 sm:p-10 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-white mb-4">
                Not Sure Which Score You Need?
              </h2>
              <p class="text-slate-300 mb-6">
                Tell us your target country and visa type — our counsellors will tell you exactly which test to take
                and what score to aim for, free of cost.
              </p>
              <ul class="space-y-3 text-sm text-slate-200">
                {['Free IELTS/PTE demo class', 'Personalised score target', 'Full test prep support'].map((item) => (
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-amber-400"></i> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div class="bg-white rounded-2xl p-6 sm:p-8">
              <EnquiryForm settings={settings} idPrefix="score-charts" defaultService="Coaching" compact heading="Book a Free Score Assessment" />
            </div>
          </div>
        </div>
      </section>

      <script src="/static/js/score-converter.js"></script>
    </>,
    {
      title: 'IELTS to PTE to CLB Score Chart & Converter',
      description:
        'Free IELTS band chart, PTE Academic score chart, PTE Core to CLB chart, and an instant IELTS-PTE-CLB score converter. Find your exact Canadian Language Benchmark (CLB) level.',
      jsonLd: [jsonLd]
    }
  )
})

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div class="reveal bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
      <h3 class="font-display font-bold text-brand-blue mb-2 flex items-start gap-2">
        <i class="fa-solid fa-circle-question text-brand-red mt-1"></i> {q}
      </h3>
      <p class="text-slate-600 text-sm leading-relaxed pl-6">{a}</p>
    </div>
  )
}

export default scoreChartsPage
