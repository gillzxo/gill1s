// =====================================================================
// Public API routes — enquiry submission (with honeypot, rate limiting,
// reCAPTCHA v3, D1 insert, and fan-out notifications).
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { enquirySchema, formatZodError } from '../lib/validation'
import { isRateLimited, getClientIp } from '../lib/ratelimit'
import { verifyRecaptcha, dispatchEnquiryNotifications } from '../lib/notifications'
import { getSettings, whatsappLink } from '../lib/settings'

const api = new Hono<{ Bindings: Bindings }>()

api.post('/enquiry', async (c) => {
  const ip = getClientIp(c.req.raw)

  try {
    const limited = await isRateLimited(c.env.DB, ip, 'enquiry', 5, 10)
    if (limited) {
      return c.json({ ok: false, error: 'Too many submissions. Please try again in a few minutes or call us directly.' }, 429)
    }

    const formData = await c.req.formData()
    const raw = Object.fromEntries(formData.entries())

    const parsed = enquirySchema.safeParse(raw)
    if (!parsed.success) {
      return c.json({ ok: false, error: formatZodError(parsed.error) }, 400)
    }

    const data = parsed.data

    // Honeypot — silently "succeed" so bots don't learn anything, but never save.
    if (data.website) {
      return c.json({ ok: true, honeypot: true })
    }

    const recaptchaOk = await verifyRecaptcha(c.env, data.recaptcha_token || '', ip)
    if (!recaptchaOk) {
      return c.json({ ok: false, error: 'Verification failed. Please try again.' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO enquiries
        (name, phone, email, city, service, preferred_country, last_qualification, message, consent, source_page, extra_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        data.name,
        data.phone,
        data.email || null,
        data.city || null,
        data.service,
        data.preferred_country || null,
        data.last_qualification || null,
        data.message || null,
        data.consent ? 1 : 0,
        data.source_page || null,
        data.extra_json || null,
        ip
      )
      .run()

    const enquiryId = result.meta.last_row_id as number
    const createdAt = new Date().toISOString()

    // Fire-and-forget notifications (don't block the response on slow webhooks)
    c.executionCtx.waitUntil(dispatchEnquiryNotifications(c.env, { ...data, id: enquiryId, created_at: createdAt }))

    const settings = await getSettings(c.env.DB)
    const waMessage = `Hi! I just submitted an enquiry for ${data.service}. My name is ${data.name}. Looking forward to hearing from you!`

    return c.json({
      ok: true,
      id: enquiryId,
      whatsappLink: whatsappLink(settings.whatsapp_number, waMessage)
    })
  } catch (err) {
    console.error('Enquiry submission failed', err)
    return c.json({ ok: false, error: 'Something went wrong on our end. Please call us directly.' }, 500)
  }
})

export default api
