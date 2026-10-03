// =====================================================================
// Reusable enquiry form — mobile-first, Zod-validated on the server,
// honeypot anti-spam field, reCAPTCHA v3 hook, and a success state with
// a "Chat on WhatsApp now" button. Used on Home, Coaching, Study Abroad,
// Education Loan, and Contact pages.
// =====================================================================
import type { SiteSettings } from '../lib/types'

interface Props {
  settings: SiteSettings
  idPrefix?: string
  defaultService?: string
  heading?: string
  subheading?: string
  compact?: boolean
}

const SERVICES = ['Coaching', 'Study Abroad', 'Loan', 'Visa', 'Other']
const COUNTRIES = ['Canada', 'UK', 'Australia', 'USA', 'Germany', 'New Zealand', 'Ireland', 'Not Sure Yet']
const QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Other']

export function EnquiryForm({ settings, idPrefix = 'ef', defaultService = 'Study Abroad', heading, subheading, compact }: Props) {
  const waLink = `https://wa.me/${settings.whatsapp_number}`

  return (
    <div class="relative">
      <form data-enquiry-form class="space-y-4" aria-label="Enquiry form">
        {heading ? (
          <div class="mb-2">
            <h3 class="font-display text-2xl font-bold text-brand-blue">{heading}</h3>
            {subheading ? <p class="text-slate-500 text-sm mt-1">{subheading}</p> : null}
          </div>
        ) : null}

        {/* Honeypot — hidden from real users, bots tend to fill every field */}
        <div class="absolute opacity-0 pointer-events-none -z-10" aria-hidden="true">
          <label htmlFor={`${idPrefix}-website`}>Leave this field empty</label>
          <input type="text" id={`${idPrefix}-website`} name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div class={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
          <div>
            <label htmlFor={`${idPrefix}-name`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Full Name *
            </label>
            <input
              id={`${idPrefix}-name`}
              name="name"
              type="text"
              required
              placeholder="e.g. Harpreet Kaur"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-phone`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Mobile Number *
            </label>
            <input
              id={`${idPrefix}-phone`}
              name="phone"
              type="tel"
              required
              inputMode="numeric"
              placeholder="98765 43210"
              pattern="^(?:\+91[\s-]?|0)?[6-9]\d{9}$"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
            />
          </div>
        </div>

        <div class={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
          <div>
            <label htmlFor={`${idPrefix}-email`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Email Address
            </label>
            <input
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              placeholder="you@example.com"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-city`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              City
            </label>
            <input
              id={`${idPrefix}-city`}
              name="city"
              type="text"
              placeholder="e.g. Moga"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition"
            />
          </div>
        </div>

        <div class={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-4`}>
          <div>
            <label htmlFor={`${idPrefix}-service`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Interested Service *
            </label>
            <select
              id={`${idPrefix}-service`}
              name="service"
              required
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition bg-white"
            >
              {SERVICES.map((s) => (
                <option value={s} selected={s === defaultService}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-country`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Preferred Country
            </label>
            <select
              id={`${idPrefix}-country`}
              name="preferred_country"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition bg-white"
            >
              <option value="">Select a country</option>
              {COUNTRIES.map((ctry) => (
                <option value={ctry}>{ctry}</option>
              ))}
            </select>
          </div>
        </div>

        {!compact ? (
          <div>
            <label htmlFor={`${idPrefix}-qualification`} class="block text-sm font-semibold text-slate-700 mb-1.5">
              Last Qualification
            </label>
            <select
              id={`${idPrefix}-qualification`}
              name="last_qualification"
              class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition bg-white"
            >
              <option value="">Select qualification</option>
              {QUALIFICATIONS.map((q) => (
                <option value={q}>{q}</option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor={`${idPrefix}-message`} class="block text-sm font-semibold text-slate-700 mb-1.5">
            Message
          </label>
          <textarea
            id={`${idPrefix}-message`}
            name="message"
            rows={compact ? 2 : 3}
            placeholder="Tell us a bit about your plans..."
            class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition resize-none"
          ></textarea>
        </div>

        {/* Hidden field used by loan calculators to attach EMI results */}
        <input type="hidden" name="extra_json" value="" />
        <input type="hidden" name="source_page" value="" />

        <div class="flex items-start gap-3">
          <input
            id={`${idPrefix}-consent`}
            name="consent"
            type="checkbox"
            required
            class="mt-1 w-4 h-4 accent-brand-red"
          />
          <label htmlFor={`${idPrefix}-consent`} class="text-xs text-slate-500 leading-relaxed">
            I agree to be contacted by {settings.business_name} via phone, SMS, email, or WhatsApp regarding my enquiry. I
            have read the{' '}
            <a href="/privacy-policy" class="text-brand-red underline">
              Privacy Policy
            </a>
            .*
          </label>
        </div>

        <div data-form-error class="hidden text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert"></div>

        <button
          type="submit"
          class="w-full inline-flex items-center justify-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold py-3.5 rounded-lg shadow-lg shadow-red-200 transition-colors"
        >
          <i class="fa-solid fa-paper-plane"></i> Get Free Consultation
        </button>

        <p class="text-center text-xs text-slate-400">
          🔒 Your information is 100% safe and confidential with us.
        </p>
      </form>

      <div data-form-success class="hidden text-center py-10">
        <div class="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <i class="fa-solid fa-check text-3xl"></i>
        </div>
        <h3 class="font-display text-xl font-bold text-brand-blue mb-2">Thank you! We've received your enquiry.</h3>
        <p class="text-slate-500 mb-6">Our counsellor will call you shortly. You can also chat with us right away on WhatsApp.</p>
        <a
          data-wa-link
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#1ebe5a] text-white font-bold px-6 py-3 rounded-full"
        >
          <i class="fa-brands fa-whatsapp text-xl"></i> Chat on WhatsApp Now
        </a>
      </div>
    </div>
  )
}
