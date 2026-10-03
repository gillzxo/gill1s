// =====================================================================
// Visitor Visa — document checklist + Statement of Purpose (SOP) guidance
// for tourist/visitor visa applicants (parents visiting children abroad,
// short-term travel, etc.). SEO-optimised for "visitor visa checklist",
// "visitor visa SOP" style searches.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero, SectionHeading } from '../components/shared'

const visitorVisaPage = new Hono<{ Bindings: Bindings }>()

const DOCUMENT_CHECKLIST = [
  { icon: 'fa-passport', text: 'Valid passport (with at least 6 months validity beyond travel dates)' },
  { icon: 'fa-id-card', text: 'Passport-size photographs (as per destination country specifications)' },
  { icon: 'fa-file-invoice-dollar', text: 'Bank statements (last 6 months) showing sufficient funds' },
  { icon: 'fa-sack-dollar', text: 'Income Tax Returns (ITR) for the last 2-3 years' },
  { icon: 'fa-briefcase', text: 'Proof of employment / business (salary slips, leave letter, or business registration)' },
  { icon: 'fa-house', text: 'Proof of ties to India (property papers, family details, fixed deposits)' },
  { icon: 'fa-plane', text: 'Confirmed or dummy round-trip flight itinerary' },
  { icon: 'fa-bed', text: 'Hotel booking / accommodation proof or invitation letter from host' },
  { icon: 'fa-envelope-open-text', text: 'Invitation letter (if visiting family/friends) with their ID & status proof' },
  { icon: 'fa-shield-heart', text: 'Travel / medical insurance covering the visit duration' },
  { icon: 'fa-file-pen', text: 'Statement of Purpose (SOP) explaining the purpose and plan of the visit' },
  { icon: 'fa-heart-pulse', text: 'Medical certificate (for senior citizen applicants, if required by destination)' }
]

const SOP_DOS = [
  'State the exact purpose of your visit clearly in the opening lines (tourism, visiting family, attending an event, etc.)',
  'Mention specific dates, cities, and places you plan to visit',
  'Explain your relationship with the host/inviter, if visiting family or friends',
  'Highlight strong ties to India — job, business, property, family — that show you intend to return',
  'Mention who is funding the trip and attach matching financial proof',
  'Keep it honest, specific, and consistent with your other documents',
  'Keep the tone simple and factual — 1 to 1.5 pages is usually enough'
]

const SOP_DONTS = [
  "Don't copy a generic template word-for-word — visa officers read thousands of SOPs and can spot copy-paste content",
  "Don't exaggerate your financial position or job role beyond what your documents support",
  "Don't leave out your return travel plan or come across as vague about your intentions",
  "Don't contradict dates/details mentioned in your flight itinerary, invitation letter, or bank statements",
  "Don't use overly emotional or irrelevant content — stick to facts relevant to the visa decision"
]

visitorVisaPage.get('/visitor-visa', async (c) => {
  const settings = c.get('settings')

  return c.render(
    <>
      <PageHero
        title="Visitor Visa Guidance — Document Checklist & SOP Tips"
        subtitle="Planning a short visit abroad to meet family, attend an event, or travel? Here's exactly what you need and how to write a strong Statement of Purpose."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Visitor Visa' }]}
      />

      {/* Intro */}
      <section class="py-16">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center reveal">
          <p class="text-slate-600 text-lg leading-relaxed">
            A visitor (tourist) visa lets you travel abroad for short-term purposes — visiting family, tourism,
            attending a wedding or event — without the right to work or study. Most visitor visa rejections happen
            not because of fund shortage, but because of <strong>incomplete documentation</strong> or a{' '}
            <strong>weak/generic Statement of Purpose</strong>. Our counsellors at {settings.branch_name || settings.business_name}{' '}
            review every applicant's file personally before submission to maximise approval chances.
          </p>
        </div>
      </section>

      {/* Document Checklist */}
      <section class="py-16 bg-slate-50">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Be Fully Prepared" title="Visitor Visa Document Checklist" subtitle="A general checklist for most countries (Canada, UK, Schengen, Australia, USA). Exact requirements vary by destination — we'll confirm your specific list in a free consultation." />
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENT_CHECKLIST.map((doc) => (
              <div class="reveal flex items-start gap-3 bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div class="w-9 h-9 rounded-full bg-red-50 text-brand-red flex items-center justify-center shrink-0">
                  <i class={`fa-solid ${doc.icon}`}></i>
                </div>
                <p class="text-slate-700 text-sm leading-relaxed">{doc.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOP Guidance */}
      <section class="py-20">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Statement of Purpose"
            title="How to Write a Strong Visitor Visa SOP"
            subtitle="Your SOP is often the deciding factor. Here's what to include — and what to avoid."
          />
          <div class="grid lg:grid-cols-2 gap-8">
            <div class="reveal bg-green-50 border border-green-100 rounded-2xl p-7">
              <h3 class="font-display font-bold text-lg text-green-700 mb-4 flex items-center gap-2">
                <i class="fa-solid fa-circle-check"></i> Do This
              </h3>
              <ul class="space-y-3">
                {SOP_DOS.map((tip) => (
                  <li class="flex items-start gap-2 text-sm text-slate-700">
                    <i class="fa-solid fa-check text-green-600 mt-1 shrink-0"></i> {tip}
                  </li>
                ))}
              </ul>
            </div>
            <div class="reveal bg-red-50 border border-red-100 rounded-2xl p-7">
              <h3 class="font-display font-bold text-lg text-brand-red mb-4 flex items-center gap-2">
                <i class="fa-solid fa-circle-xmark"></i> Avoid This
              </h3>
              <ul class="space-y-3">
                {SOP_DONTS.map((tip) => (
                  <li class="flex items-start gap-2 text-sm text-slate-700">
                    <i class="fa-solid fa-xmark text-brand-red mt-1 shrink-0"></i> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div class="reveal bg-blue-50 border border-blue-100 rounded-2xl p-7 mt-8">
            <h3 class="font-display font-bold text-brand-blue text-lg mb-3 flex items-center gap-2">
              <i class="fa-solid fa-lightbulb text-brand-red"></i> Sample SOP Structure
            </h3>
            <ol class="list-decimal list-inside space-y-2 text-sm text-slate-700 leading-relaxed">
              <li><strong>Introduction:</strong> Who you are, your occupation, and the purpose of your visit.</li>
              <li><strong>Details of the Visit:</strong> Exact dates, cities, and the host/event (if applicable).</li>
              <li><strong>Relationship &amp; Invitation:</strong> How you know the host and their current status abroad.</li>
              <li><strong>Financial Support:</strong> Who is funding the trip and proof of sufficient funds.</li>
              <li><strong>Ties to Home Country:</strong> Your job, business, family, and property that confirm your intent to return.</li>
              <li><strong>Conclusion:</strong> A clear statement of your return date and commitment to abide by visa conditions.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* CTA + Form */}
      <section class="py-20 bg-brand-blue">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="bg-white rounded-2xl shadow-2xl p-6 sm:p-10 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-brand-blue mb-4">
                Get Your Documents &amp; SOP Reviewed — Free
              </h2>
              <p class="text-slate-500 mb-6">
                Avoid a rejection. Our counsellors will personally review your document checklist and help you draft
                a strong, honest Statement of Purpose tailored to your destination country.
              </p>
              <ul class="space-y-3 text-sm text-slate-600">
                {['Personalised document checklist for your destination', 'SOP review & drafting assistance', 'Guidance on visa interview (where applicable)'].map((item) => (
                  <li class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-brand-red"></i> {item}
                  </li>
                ))}
              </ul>
            </div>
            <EnquiryForm settings={settings} idPrefix="visitor-visa" defaultService="Visa" compact heading="Book Free Visitor Visa Consultation" />
          </div>
        </div>
      </section>
    </>,
    {
      title: 'Visitor Visa Checklist & SOP Guidance',
      description: `Complete visitor visa document checklist and Statement of Purpose (SOP) writing guide from ${settings.business_name}. Get your file reviewed for free before you apply.`
    }
  )
})

export default visitorVisaPage
