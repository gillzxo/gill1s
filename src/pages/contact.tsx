// =====================================================================
// Contact page — enquiry form, Google Map embed, address, click-to-call,
// WhatsApp link, and office hours.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { EnquiryForm } from '../components/EnquiryForm'
import { PageHero } from '../components/shared'
import { whatsappLink } from '../lib/settings'

const contactPage = new Hono<{ Bindings: Bindings }>()

contactPage.get('/contact', async (c) => {
  const settings = c.get('settings')
  const waLink = whatsappLink(settings.whatsapp_number, "Hi! I'd like to get in touch regarding your services.")

  return c.render(
    <>
      <PageHero
        title="Get In Touch With Us"
        subtitle="Visit our Ludhiana office, call us, or send an enquiry — our counsellors are ready to help."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />

      <section class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10">
          {/* Contact info + map */}
          <div class="lg:col-span-2 space-y-6">
            <div class="reveal bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <ContactRow icon="fa-location-dot" label="Office Address" value={settings.address} />
              <ContactRow
                icon="fa-phone"
                label="Call Us"
                value={`${settings.phone_primary}${settings.phone_secondary ? ', ' + settings.phone_secondary : ''}`}
                href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
              />
              <ContactRow icon="fa-envelope" label="Email" value={settings.email} href={`mailto:${settings.email}`} />
              <ContactRow icon="fa-clock" label="Office Hours" value={settings.office_hours} />

              <div class="flex flex-col sm:flex-row gap-3 pt-2">
                <a
                  href={`tel:${settings.phone_primary.replace(/\s/g, '')}`}
                  class="flex-1 inline-flex items-center justify-center gap-2 bg-brand-blue text-white font-bold py-3 rounded-full hover:bg-brand-bluelight transition-colors"
                >
                  <i class="fa-solid fa-phone"></i> Call Now
                </a>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex-1 inline-flex items-center justify-center gap-2 bg-[#25d366] text-white font-bold py-3 rounded-full hover:bg-[#1ebe5a] transition-colors"
                >
                  <i class="fa-brands fa-whatsapp text-xl"></i> WhatsApp
                </a>
              </div>
            </div>

            <div class="reveal rounded-2xl overflow-hidden border border-slate-100 shadow-sm h-72">
              <iframe
                src={settings.google_maps_embed}
                class="w-full h-full border-0"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                title="Office location map"
              ></iframe>
            </div>

            <div class="reveal flex gap-3">
              {settings.instagram_url ? (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 text-white flex items-center justify-center text-xl"
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
                  class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl"
                  aria-label="Facebook"
                >
                  <i class="fa-brands fa-facebook-f"></i>
                </a>
              ) : null}
            </div>
          </div>

          {/* Enquiry form */}
          <div class="lg:col-span-3">
            <div class="reveal bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-10">
              <EnquiryForm settings={settings} idPrefix="contact" heading="Send Us an Enquiry" subheading="Fill the form below and we'll get back to you within minutes." />
            </div>
          </div>
        </div>
      </section>
    </>,
    {
      title: 'Contact Us',
      description: `Contact ${settings.business_name} in Ludhiana, Punjab. Call, WhatsApp, or send an enquiry for free consultation on IELTS coaching, study abroad, loans & visa services.`
    }
  )
})

function ContactRow({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  const content = (
    <div class="flex items-start gap-4">
      <div class="w-11 h-11 rounded-full bg-red-50 text-brand-red flex items-center justify-center shrink-0">
        <i class={`fa-solid ${icon}`}></i>
      </div>
      <div>
        <p class="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p class="text-slate-700 font-semibold">{value}</p>
      </div>
    </div>
  )
  return href ? (
    <a href={href} class="block hover:opacity-80 transition-opacity">
      {content}
    </a>
  ) : (
    content
  )
}

export default contactPage
