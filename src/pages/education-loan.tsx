// =====================================================================
// Education Loan page — info sections + 3 client-side calculators:
//   A. EMI Calculator (reducing balance, with moratorium capitalisation)
//   B. Flat Rate vs Reducing Rate comparison
//   C. Eligibility & Moratorium Calculator
// All math runs in the browser (public/static/js/loan-calculators.js).
// Chart.js renders the donut/bar charts; jsPDF generates a downloadable
// summary. Every "Get Free Loan Assistance" button opens the shared
// enquiry modal pre-filled with the calculated loan amount & EMI.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero, SectionHeading } from '../components/shared'

const loan = new Hono<{ Bindings: Bindings }>()

const LOAN_TYPES = [
  { name: 'Secured Education Loan', desc: 'Backed by collateral (property/FD) — higher loan amount, lower interest rates (~8.5%-10.5% p.a.).' },
  { name: 'Unsecured Education Loan', desc: 'No collateral needed — faster approval, typically capped around ₹7.5-20 Lakh depending on the bank/NBFC.' },
  { name: 'Government Bank Loans', desc: 'SBI, PNB, Bank of Baroda etc. offer subsidised schemes with competitive rates for meritorious students.' },
  { name: 'NBFC / Private Lender Loans', desc: 'Faster processing (Avanse, InCred, HDFC Credila) — great for destinations/courses not covered by PSU banks.' }
]

const BANKS = ['SBI', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Axis Bank', 'HDFC Credila', 'Avanse', 'InCred']

const REQUIRED_DOCS = [
  'Admission / Offer Letter from University',
  'Academic Transcripts (10th, 12th, Bachelor\'s)',
  'IELTS/PTE/TOEFL Score Card',
  'KYC Documents (Aadhaar, PAN, Passport)',
  'Co-applicant Income Proof (Salary Slips / ITR)',
  'Collateral Documents (if applicable)',
  'Bank Statements (last 6 months)',
  'Passport-size Photographs'
]

const PROCESS_STEPS = [
  { step: '1', title: 'Document Collection', desc: 'We help you gather and organise every required document.' },
  { step: '2', title: 'Bank/NBFC Shortlisting', desc: 'We compare rates across multiple lenders to find your best fit.' },
  { step: '3', title: 'Application Filing', desc: 'Our team fills and files your loan application end-to-end.' },
  { step: '4', title: 'Sanction & Disbursement', desc: 'We follow up until your loan is sanctioned and disbursed on time.' }
]

loan.get('/education-loan', async (c) => {
  const settings = c.get('settings')

  return c.render(
    <>
      <PageHero
        title="Education Loan Assistance & Free Calculators"
        subtitle="Understand your EMI, compare interest types, and check your loan eligibility — instantly, before you apply."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Education Loan' }]}
      />

      {/* Loan Types */}
      <section class="py-20">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Know Your Options" title="Types of Education Loans" />
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOAN_TYPES.map((lt) => (
              <div class="card-lift reveal bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div class="w-12 h-12 rounded-xl bg-red-50 text-brand-red flex items-center justify-center mb-4">
                  <i class="fa-solid fa-building-columns text-xl"></i>
                </div>
                <h3 class="font-display font-bold text-brand-blue mb-2">{lt.name}</h3>
                <p class="text-slate-500 text-sm leading-relaxed">{lt.desc}</p>
              </div>
            ))}
          </div>

          <div class="mt-12 grid lg:grid-cols-2 gap-10">
            <div class="reveal">
              <h3 class="font-display font-bold text-brand-blue text-xl mb-4">Partner Banks &amp; NBFCs</h3>
              <div class="flex flex-wrap gap-3">
                {BANKS.map((b) => (
                  <span class="bg-slate-100 text-slate-600 text-sm font-semibold px-4 py-2 rounded-full">{b}</span>
                ))}
              </div>
            </div>
            <div class="reveal">
              <h3 class="font-display font-bold text-brand-blue text-xl mb-4">Documents Required</h3>
              <ul class="grid sm:grid-cols-2 gap-2">
                {REQUIRED_DOCS.map((d) => (
                  <li class="flex items-start gap-2 text-sm text-slate-600">
                    <i class="fa-solid fa-circle-check text-brand-red mt-0.5 shrink-0"></i> {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section class="py-20 bg-slate-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How It Works" title="Our Loan Assistance Process" />
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((p) => (
              <div class="reveal text-center">
                <div class="w-16 h-16 rounded-full bg-brand-blue text-white font-display font-extrabold text-2xl flex items-center justify-center mx-auto mb-4">
                  {p.step}
                </div>
                <h3 class="font-display font-bold text-brand-blue mb-2">{p.title}</h3>
                <p class="text-slate-500 text-sm">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CALCULATOR A: EMI ================= */}
      <section id="emi-calculator" class="py-20 scroll-mt-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Calculator A" title="EMI Calculator (Reducing Balance)" subtitle="See your exact monthly EMI, including the moratorium (study + grace) period." />

          <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 grid lg:grid-cols-2 gap-10">
            {/* Inputs */}
            <div class="space-y-6">
              <CalcField id="emi-amount" label="Loan Amount (₹)" min={50000} max={5000000} step={10000} value={1000000} prefix="₹" />
              <CalcField id="emi-rate" label="Interest Rate (% p.a.)" min={6} max={16} step={0.1} value={10.5} suffix="%" />
              <CalcField id="emi-tenure" label="Repayment Tenure (Years)" min={1} max={15} step={1} value={10} suffix="yrs" />
              <CalcField id="emi-study" label="Study Period (Months)" min={6} max={60} step={1} value={24} suffix="mo" />
              <CalcField id="emi-grace" label="Grace Period After Study (Months)" min={0} max={12} step={1} value={6} suffix="mo" />
            </div>

            {/* Outputs */}
            <div>
              <div class="grid grid-cols-2 gap-4 mb-6">
                <ResultCard id="emi-monthly" label="Monthly EMI" />
                <ResultCard id="emi-total-interest" label="Total Interest" />
                <ResultCard id="emi-moratorium-interest" label="Moratorium Interest" />
                <ResultCard id="emi-total-payable" label="Total Payable" />
              </div>
              <div class="relative h-56 mb-4">
                <canvas id="emi-donut-chart" role="img" aria-label="Principal vs interest breakdown donut chart"></canvas>
              </div>
              <div class="flex items-center justify-center gap-6 text-sm mb-6">
                <span class="flex items-center gap-2">
                  <span class="legend-swatch" style="background:#0b2559"></span> Principal
                </span>
                <span class="flex items-center gap-2">
                  <span class="legend-swatch" style="background:#f70009"></span> Interest
                </span>
              </div>
              <div class="flex flex-wrap gap-3">
                <button
                  type="button"
                  data-open-enquiry
                  data-service="Loan"
                  data-message="I'd like free assistance with my education loan application."
                  id="emi-cta"
                  class="flex-1 inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-6 py-3 rounded-full transition-colors"
                >
                  <i class="fa-solid fa-hand-holding-dollar"></i> Get Free Loan Assistance
                </button>
                <button
                  type="button"
                  id="emi-download-pdf"
                  class="inline-flex items-center justify-center gap-2 border-2 border-brand-blue text-brand-blue font-bold px-6 py-3 rounded-full hover:bg-brand-blue hover:text-white transition-colors"
                >
                  <i class="fa-solid fa-download"></i> PDF
                </button>
              </div>
            </div>
          </div>

          {/* Amortization schedule */}
          <div class="mt-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-display font-bold text-brand-blue">Month-wise Amortisation Schedule</h3>
              <button id="emi-toggle-schedule" type="button" class="text-sm font-semibold text-brand-red">
                Show Schedule <i class="fa-solid fa-chevron-down ml-1"></i>
              </button>
            </div>
            <div id="emi-schedule-wrap" class="table-scroll hidden">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="text-left text-slate-400 border-b border-slate-100">
                    <th class="py-2 pr-4">Month</th>
                    <th class="py-2 pr-4">Opening Balance</th>
                    <th class="py-2 pr-4">EMI</th>
                    <th class="py-2 pr-4">Principal</th>
                    <th class="py-2 pr-4">Interest</th>
                    <th class="py-2 pr-4">Closing Balance</th>
                  </tr>
                </thead>
                <tbody id="emi-schedule-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CALCULATOR B: FLAT VS REDUCING ================= */}
      <section id="flat-vs-reducing" class="py-20 bg-slate-50 scroll-mt-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Calculator B" title="Flat Rate vs Reducing Rate Comparison" subtitle="See exactly how much you save by choosing a reducing-balance loan." />

          <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 grid lg:grid-cols-2 gap-10">
            <div class="space-y-6">
              <CalcField id="cmp-amount" label="Loan Amount (₹)" min={50000} max={5000000} step={10000} value={1000000} prefix="₹" />
              <CalcField id="cmp-rate" label="Interest Rate (% p.a.)" min={6} max={16} step={0.1} value={10.5} suffix="%" />
              <CalcField id="cmp-tenure" label="Repayment Tenure (Years)" min={1} max={15} step={1} value={10} suffix="yrs" />
            </div>

            <div>
              <div class="relative h-48 mb-6">
                <canvas id="cmp-bar-chart" role="img" aria-label="Flat vs reducing interest comparison bar chart"></canvas>
              </div>
              <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                  <p class="text-xs text-slate-400 font-semibold uppercase mb-1">Flat Rate</p>
                  <p class="text-lg font-extrabold text-slate-700" id="cmp-flat-emi">₹0</p>
                  <p class="text-xs text-slate-400">EMI/month</p>
                  <p class="text-sm font-bold text-red-500 mt-2" id="cmp-flat-interest">₹0</p>
                  <p class="text-xs text-slate-400">Total Interest</p>
                </div>
                <div class="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p class="text-xs text-green-600 font-semibold uppercase mb-1">Reducing Rate</p>
                  <p class="text-lg font-extrabold text-slate-700" id="cmp-reducing-emi">₹0</p>
                  <p class="text-xs text-slate-400">EMI/month</p>
                  <p class="text-sm font-bold text-green-600 mt-2" id="cmp-reducing-interest">₹0</p>
                  <p class="text-xs text-slate-400">Total Interest</p>
                </div>
              </div>
              <div class="bg-brand-blue rounded-xl p-4 text-center mb-6">
                <p class="text-xs text-slate-300 font-semibold uppercase mb-1">You Save With Reducing Balance</p>
                <p class="text-2xl font-extrabold text-white" id="cmp-savings">₹0</p>
              </div>
              <button
                type="button"
                data-open-enquiry
                data-service="Loan"
                data-message="I'd like free assistance choosing the right education loan interest type."
                class="w-full inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-6 py-3 rounded-full transition-colors"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i> Get Free Loan Assistance
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CALCULATOR C: ELIGIBILITY ================= */}
      <section id="eligibility-calculator" class="py-20 scroll-mt-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Calculator C" title="Eligibility &amp; Moratorium Calculator" subtitle="Estimate how much loan you may be eligible for, based on your course cost and co-applicant income." />

          <div class="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 grid lg:grid-cols-2 gap-10">
            <div class="space-y-6">
              <CalcField id="elg-fee" label="Total Course Fee (₹)" min={100000} max={6000000} step={50000} value={2000000} prefix="₹" />
              <CalcField id="elg-living" label="Living Cost per Year (₹)" min={100000} max={2000000} step={10000} value={600000} prefix="₹" />
              <CalcField id="elg-duration" label="Course Duration (Years)" min={1} max={5} step={1} value={2} suffix="yrs" />

              <div>
                <label class="block text-sm font-semibold text-slate-700 mb-2">Do You Have Collateral?</label>
                <div class="flex gap-3">
                  <label class="flex-1">
                    <input type="radio" name="elg-collateral" value="yes" class="peer sr-only" />
                    <span class="block text-center py-3 rounded-lg border-2 border-slate-200 peer-checked:border-brand-red peer-checked:bg-red-50 peer-checked:text-brand-red font-semibold cursor-pointer transition-colors">
                      Yes
                    </span>
                  </label>
                  <label class="flex-1">
                    <input type="radio" name="elg-collateral" value="no" class="peer sr-only" checked />
                    <span class="block text-center py-3 rounded-lg border-2 border-slate-200 peer-checked:border-brand-red peer-checked:bg-red-50 peer-checked:text-brand-red font-semibold cursor-pointer transition-colors">
                      No
                    </span>
                  </label>
                </div>
              </div>

              <CalcField id="elg-income" label="Co-Applicant Monthly Income (₹)" min={10000} max={500000} step={5000} value={60000} prefix="₹" />
              <CalcField id="elg-rate" label="Expected Interest Rate (% p.a.)" min={6} max={16} step={0.1} value={10.5} suffix="%" />
              <CalcField id="elg-tenure" label="Repayment Tenure (Years)" min={1} max={15} step={1} value={10} suffix="yrs" />
            </div>

            <div>
              <div class="space-y-4 mb-6">
                <ResultCard id="elg-eligible" label="Estimated Loan Eligibility" full />
                <ResultCard id="elg-moratorium-interest" label="Interest Accrued During Study (Simple Interest)" full />
                <ResultCard id="elg-outstanding" label="Total Outstanding at Repayment Start" full />
                <ResultCard id="elg-emi" label="Estimated Monthly EMI" full />
              </div>
              <p class="text-xs text-slate-400 mb-6">
                * This is an illustrative estimate only. Actual loan eligibility and interest rate depend on the
                bank/NBFC's policy, your academic profile, and co-applicant's credit history. Our counsellors can
                get you an accurate quote from our partner lenders.
              </p>
              <button
                type="button"
                data-open-enquiry
                data-service="Loan"
                data-message="I'd like free assistance checking my education loan eligibility."
                id="elg-cta"
                class="w-full inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-6 py-3 rounded-full transition-colors"
              >
                <i class="fa-solid fa-hand-holding-dollar"></i> Get Free Loan Assistance
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ENQUIRY MODAL ================= */}
      <dialog id="enquiry-modal" class="rounded-2xl p-0 w-[95vw] max-w-lg backdrop:bg-black/50">
        <div class="p-6 sm:p-8 relative">
          <button data-close-modal type="button" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200" aria-label="Close">
            <i class="fa-solid fa-xmark"></i>
          </button>
          <EnquiryForm settings={settings} idPrefix="modal" defaultService="Loan" heading="Get Free Loan Assistance" subheading="Our loan experts will call you within minutes." compact />
        </div>
      </dialog>

      <section class="py-16 bg-slate-50">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <p class="text-slate-500">
            Prefer to talk directly?{' '}
            <a href={`tel:${settings.phone_primary.replace(/\s/g, '')}`} class="text-brand-red font-bold">
              Call {settings.phone_primary}
            </a>{' '}
            or{' '}
            <a href="/contact" class="text-brand-red font-bold underline">
              visit our contact page
            </a>
            .
          </p>
        </div>
      </section>

      <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.1/dist/jspdf.plugin.autotable.min.js"></script>
      <script src="/static/js/loan-calculators.js"></script>
    </>,
    {
      title: 'Education Loan Calculators',
      description: `Free EMI calculator, flat vs reducing rate comparison, and loan eligibility calculator for students planning to study abroad. Get expert education loan assistance from ${settings.business_name}.`
    }
  )
})

function CalcField({
  id,
  label,
  min,
  max,
  step,
  value,
  prefix,
  suffix
}: {
  id: string
  label: string
  min: number
  max: number
  step: number
  value: number
  prefix?: string
  suffix?: string
}) {
  return (
    <div>
      <div class="flex items-center justify-between mb-2">
        <label htmlFor={id} class="text-sm font-semibold text-slate-700">
          {label}
        </label>
        <div class="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          {prefix ? <span class="text-slate-400 text-sm">{prefix}</span> : null}
          <input
            type="number"
            id={`${id}-number`}
            data-calc-number={id}
            min={min}
            max={max}
            step={step}
            value={value}
            class="w-24 bg-transparent text-right font-bold text-brand-blue outline-none text-sm"
          />
          {suffix ? <span class="text-slate-400 text-sm">{suffix}</span> : null}
        </div>
      </div>
      <input
        type="range"
        id={id}
        data-calc-slider={id}
        min={min}
        max={max}
        step={step}
        value={value}
        class="w-full accent-brand-red h-2"
      />
    </div>
  )
}

function ResultCard({ id, label, full }: { id: string; label: string; full?: boolean }) {
  return (
    <div class={`bg-slate-50 border border-slate-100 rounded-xl p-4 ${full ? 'flex items-center justify-between' : ''}`}>
      <p class="text-xs text-slate-400 font-semibold uppercase mb-1">{label}</p>
      <p id={id} class="text-xl font-extrabold text-brand-blue">
        ₹0
      </p>
    </div>
  )
}

export default loan
