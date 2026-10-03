// =====================================================================
// Notification dispatchers for a new enquiry:
//   1. WhatsApp Cloud API alert to the OWNER (staff)
//   2. Email alert to the OWNER via Resend
//   3. Email CONFIRMATION to the STUDENT who submitted the form
//   4. WhatsApp CONFIRMATION to the STUDENT who submitted the form
//   5. Append a row to a Google Sheet (via Apps Script Web App or
//      Sheets API with a service account JWT)
// Every function is best-effort and NEVER throws — a missing/invalid
// key simply skips that channel so the enquiry save never fails.
//
// All of these are OPTIONAL and controlled entirely by which secrets
// are configured (via `wrangler pages secret put` / .dev.vars):
//   RESEND_API_KEY + NOTIFY_EMAIL_TO           -> owner email alert
//   RESEND_API_KEY (NOTIFY_EMAIL_FROM optional) -> student email confirmation
//   WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_OWNER_NUMBER
//                                                -> owner WhatsApp alert
//   WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID
//                                                -> student WhatsApp confirmation
//     (WhatsApp confirmations to a NEW number require a pre-approved
//      Meta message template — see WHATSAPP_CONFIRMATION_TEMPLATE_NAME
//      below. Without one, Meta will reject the freeform text unless
//      the student messaged the business number in the last 24h.)
// =====================================================================
import type { Bindings } from './types'
import type { EnquiryInput } from './validation'

interface NotifyPayload extends EnquiryInput {
  id: number
  created_at: string
}

// ---------------------------------------------------------------------
// 1. WhatsApp Cloud API
// ---------------------------------------------------------------------
export async function sendWhatsAppAlert(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_OWNER_NUMBER) {
    return // feature not configured — skip silently
  }

  const text =
    `🔔 *New Enquiry — 1st Choice*\n\n` +
    `*Name:* ${enquiry.name}\n` +
    `*Phone:* ${enquiry.phone}\n` +
    `*Email:* ${enquiry.email || '-'}\n` +
    `*City:* ${enquiry.city || '-'}\n` +
    `*Service:* ${enquiry.service}\n` +
    `*Preferred Country:* ${enquiry.preferred_country || '-'}\n` +
    `*Qualification:* ${enquiry.last_qualification || '-'}\n` +
    `*Message:* ${enquiry.message || '-'}\n` +
    `*Source:* ${enquiry.source_page || '-'}\n` +
    `*Time:* ${enquiry.created_at}`

  try {
    await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: env.WHATSAPP_OWNER_NUMBER,
        type: 'text',
        text: { body: text, preview_url: false }
      })
    })
  } catch (err) {
    console.error('WhatsApp alert failed', err)
  }
}

// ---------------------------------------------------------------------
// 1b. WhatsApp confirmation to the STUDENT (business-initiated message).
//     Meta requires either (a) a pre-approved message template, or
//     (b) the recipient having messaged the business number within the
//     last 24 hours, for a business to WhatsApp a user who hasn't
//     opted in via a template. We try a template first if configured;
//     otherwise we attempt a freeform text (works only within the 24h
//     service window, e.g. if the student just messaged via the
//     floating WhatsApp button) and silently skip on failure.
// ---------------------------------------------------------------------
export async function sendWhatsAppConfirmationToStudent(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID || !enquiry.phone) {
    return // feature not configured — skip silently
  }

  // Normalise to a 91XXXXXXXXXX E.164-ish number for the Cloud API
  const digits = enquiry.phone.replace(/\D/g, '')
  const toNumber = digits.length === 10 ? `91${digits}` : digits.replace(/^0/, '91')

  try {
    if (env.WHATSAPP_CONFIRMATION_TEMPLATE_NAME) {
      // Preferred, reliable path: a pre-approved template. Expected to
      // take one body variable — the student's first name.
      await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'template',
          template: {
            name: env.WHATSAPP_CONFIRMATION_TEMPLATE_NAME,
            language: { code: env.WHATSAPP_CONFIRMATION_TEMPLATE_LANG || 'en' },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: enquiry.name.split(' ')[0] || enquiry.name }]
              }
            ]
          }
        })
      })
    } else {
      // Fallback: freeform text. Only delivers if the 24h service
      // window is open; Meta silently rejects it otherwise — that's
      // fine, the owner alert + email confirmation still went out.
      const text =
        `Hi ${enquiry.name}! 👋\n\n` +
        `Thank you for submitting your enquiry to *1st Choice IELTS & Immigration*.\n` +
        `We've received your details for *${enquiry.service}*${enquiry.preferred_country ? ` (${enquiry.preferred_country})` : ''} and one of our counsellors will call you shortly.\n\n` +
        `Feel free to reply here with any questions in the meantime!`
      await fetch(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toNumber,
          type: 'text',
          text: { body: text, preview_url: false }
        })
      })
    }
  } catch (err) {
    console.error('WhatsApp student confirmation failed', err)
  }
}

// ---------------------------------------------------------------------
// 2. Email via Resend
// ---------------------------------------------------------------------
export async function sendEmailAlert(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL_TO) return

  const html = `
    <h2>New Enquiry — 1st Choice IELTS &amp; Immigration</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Name</b></td><td>${escapeHtml(enquiry.name)}</td></tr>
      <tr><td><b>Phone</b></td><td>${escapeHtml(enquiry.phone)}</td></tr>
      <tr><td><b>Email</b></td><td>${escapeHtml(enquiry.email || '-')}</td></tr>
      <tr><td><b>City</b></td><td>${escapeHtml(enquiry.city || '-')}</td></tr>
      <tr><td><b>Service</b></td><td>${escapeHtml(enquiry.service)}</td></tr>
      <tr><td><b>Preferred Country</b></td><td>${escapeHtml(enquiry.preferred_country || '-')}</td></tr>
      <tr><td><b>Last Qualification</b></td><td>${escapeHtml(enquiry.last_qualification || '-')}</td></tr>
      <tr><td><b>Message</b></td><td>${escapeHtml(enquiry.message || '-')}</td></tr>
      <tr><td><b>Source Page</b></td><td>${escapeHtml(enquiry.source_page || '-')}</td></tr>
      <tr><td><b>Submitted At</b></td><td>${escapeHtml(enquiry.created_at)}</td></tr>
    </table>
    <p><a href="${env.PUBLIC_BASE_URL || ''}/admin/enquiries">Open in Admin Portal</a></p>
  `

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.NOTIFY_EMAIL_FROM || 'enquiries@1stchoiceimmigration.com',
        to: [env.NOTIFY_EMAIL_TO],
        subject: `New Enquiry: ${enquiry.name} (${enquiry.service})`,
        html
      })
    })
  } catch (err) {
    console.error('Email alert failed', err)
  }
}

// ---------------------------------------------------------------------
// 2b. Email CONFIRMATION to the STUDENT (sent only if they gave an
//     email address — it's an optional field on the form). Lets us
//     confirm receipt even when WhatsApp isn't configured/available.
// ---------------------------------------------------------------------
export async function sendEmailConfirmationToStudent(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  if (!env.RESEND_API_KEY || !enquiry.email) return

  const firstName = enquiry.name.split(' ')[0] || enquiry.name
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
      <h2 style="color:#0b2559;">Thank you, ${escapeHtml(firstName)}! 🎉</h2>
      <p style="color:#334155; font-size:15px; line-height:1.6;">
        We've received your enquiry for <strong>${escapeHtml(enquiry.service)}</strong>${
          enquiry.preferred_country ? ` (${escapeHtml(enquiry.preferred_country)})` : ''
        } at <strong>1st Choice IELTS &amp; Immigration</strong> (Bagha Purana, Moga).
      </p>
      <p style="color:#334155; font-size:15px; line-height:1.6;">
        One of our counsellors will call you on <strong>${escapeHtml(enquiry.phone)}</strong> shortly. If you'd like
        to chat right away, you can reach us on WhatsApp or by phone.
      </p>
      <table cellpadding="6" style="border-collapse:collapse; margin: 16px 0; font-size: 14px; color:#475569;">
        <tr><td><strong>Phone</strong></td><td>+91 97806 90090</td></tr>
        <tr><td><strong>Address</strong></td><td>Opp. Bus Stand, Kotkapura Road, Bagha Purana, Moga, Punjab 142038</td></tr>
      </table>
      <p style="color:#94a3b8; font-size:12px; margin-top: 24px;">
        This is an automatic confirmation — please do not reply directly to this email. For any questions, call or
        WhatsApp us using the number above.
      </p>
    </div>
  `

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.NOTIFY_EMAIL_FROM || 'enquiries@1stchoiceimmigration.com',
        to: [enquiry.email],
        subject: `We've received your enquiry — 1st Choice IELTS & Immigration`,
        html
      })
    })
  } catch (err) {
    console.error('Student email confirmation failed', err)
  }
}

// ---------------------------------------------------------------------
// 3. Google Sheets — append a row via a published Apps Script Web App
//    (simplest, no OAuth needed) OR directly via the Sheets API using a
//    service-account JWT (see README setup guide for both options).
// ---------------------------------------------------------------------
export async function appendToGoogleSheet(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  // Preferred: a single webhook URL (Apps Script Web App) — zero extra deps.
  if (env.GOOGLE_SHEETS_WEBHOOK_URL) {
    try {
      await fetch(env.GOOGLE_SHEETS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: enquiry.created_at,
          name: enquiry.name,
          phone: enquiry.phone,
          email: enquiry.email || '',
          city: enquiry.city || '',
          service: enquiry.service,
          preferred_country: enquiry.preferred_country || '',
          last_qualification: enquiry.last_qualification || '',
          message: enquiry.message || '',
          source_page: enquiry.source_page || ''
        })
      })
    } catch (err) {
      console.error('Google Sheets webhook failed', err)
    }
    return
  }

  // Fallback: direct Sheets API call using a service-account JWT.
  if (
    env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_SHEETS_PRIVATE_KEY &&
    env.GOOGLE_SHEETS_SPREADSHEET_ID
  ) {
    try {
      const accessToken = await getGoogleAccessToken(
        env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL,
        env.GOOGLE_SHEETS_PRIVATE_KEY
      )
      const row = [
        enquiry.created_at,
        enquiry.name,
        enquiry.phone,
        enquiry.email || '',
        enquiry.city || '',
        enquiry.service,
        enquiry.preferred_country || '',
        enquiry.last_qualification || '',
        enquiry.message || '',
        enquiry.source_page || ''
      ]
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SHEETS_SPREADSHEET_ID}/values/Sheet1!A:J:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: [row] })
        }
      )
    } catch (err) {
      console.error('Google Sheets API append failed', err)
    }
  }
}

// Mint a short-lived OAuth2 access token from a Google service-account
// JSON key, signed with Web Crypto (RS256) — no Node `crypto` needed.
async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const unsigned = `${encode(header)}.${encode(claimSet)}`
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '')
    .trim()
  const binaryKey = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const jwt = `${unsigned}.${signatureB64}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  const data = (await resp.json()) as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error || 'Failed to get Google access token')
  return data.access_token
}

// ---------------------------------------------------------------------
// reCAPTCHA v3 verification
// ---------------------------------------------------------------------
export async function verifyRecaptcha(env: Bindings, token: string, remoteIp?: string): Promise<boolean> {
  if (!env.RECAPTCHA_SECRET_KEY) return true // not configured → skip check
  if (!token) return false
  try {
    const params = new URLSearchParams({ secret: env.RECAPTCHA_SECRET_KEY, response: token })
    if (remoteIp) params.set('remoteip', remoteIp)
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })
    const data = (await resp.json()) as { success: boolean; score?: number }
    return data.success && (data.score === undefined || data.score >= 0.3)
  } catch (err) {
    console.error('reCAPTCHA verification failed', err)
    return true // fail-open so a Google outage never blocks real leads
  }
}

// ---------------------------------------------------------------------
// Dispatch all channels in parallel, swallowing individual failures.
// ---------------------------------------------------------------------
export async function dispatchEnquiryNotifications(env: Bindings, enquiry: NotifyPayload): Promise<void> {
  await Promise.allSettled([
    sendWhatsAppAlert(env, enquiry), // → owner/staff
    sendEmailAlert(env, enquiry), // → owner/staff
    sendEmailConfirmationToStudent(env, enquiry), // → student (if email given + RESEND_API_KEY set)
    sendWhatsAppConfirmationToStudent(env, enquiry), // → student (if WhatsApp Cloud API configured)
    appendToGoogleSheet(env, enquiry)
  ])
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
