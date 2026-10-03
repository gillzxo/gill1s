// =====================================================================
// Notification dispatchers for a new enquiry:
//   1. WhatsApp Cloud API alert to the owner
//   2. Email alert via Resend
//   3. Append a row to a Google Sheet (via Apps Script Web App or
//      Sheets API with a service account JWT)
// Every function is best-effort and NEVER throws — a missing/invalid
// key simply skips that channel so the enquiry save never fails.
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
    sendWhatsAppAlert(env, enquiry),
    sendEmailAlert(env, enquiry),
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
