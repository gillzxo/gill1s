// =====================================================================
// Site settings helper — reads the key/value `site_settings` table into
// a plain object, with sane defaults so pages never crash on a missing
// key (e.g. right after a fresh DB migration before seeding).
// =====================================================================
import type { SiteSettings } from './types'

export const DEFAULT_SETTINGS: SiteSettings = {
  business_name: '1st Choice IELTS & Immigration',
  tagline: 'A Consultancy Firm',
  phone_primary: '+91 97806 90090',
  phone_secondary: '+91 97805 90090',
  whatsapp_number: '919780690090',
  email: '1stchoiceimmigration@gmail.com',
  address: 'Opp. Bus Stand, Kotkapura Road, Bagha Purana, Moga, Punjab 142038',
  office_hours: 'Mon - Sat: 10:00 AM - 7:00 PM, Sunday: By appointment',
  instagram_url: 'https://www.instagram.com/1stchoice_immigration/',
  facebook_url: 'https://www.facebook.com/1stchoiceBaghaPurana/',
  youtube_url: '',
  google_maps_embed:
    'https://www.google.com/maps?q=Opp.+Bus+Stand,+Kotkapura+Road,+Bagha+Purana,+Moga,+Punjab+142038&output=embed',
  google_rating: '4.8',
  google_review_count: '320',
  stat_students_placed: '3500',
  stat_visas_approved: '2800',
  stat_years_experience: '8',
  stat_countries: '12',
  announcement_bar_text: '',
  announcement_bar_enabled: '0',
  recaptcha_site_key: '',
  google_sheets_enabled: '0',
  whatsapp_api_enabled: '0',
  instagram_embed_code: '',
  reviews_widget_code: '',
  branch_name: '1st Choice IELTS & Immigration (Bagha Purana)',
  founded_year: '2018',
  md_name: 'Gurpiar Singh Gill',
  md_title: 'Managing Director',
  md_photo_url: '/static/images/director-gurpiar-singh-gill.jpg',
  md_bio:
    'Gurpiar Singh Gill founded 1st Choice IELTS & Immigration in Bagha Purana in 2018 with one simple goal — give students in Moga and the surrounding villages honest, affordable access to world-class IELTS/PTE coaching and transparent immigration advice. Since then he has personally guided thousands of students through their IELTS/PTE preparation and visa journeys to Canada, UK, Australia, USA and Europe.',
  popup_enabled: '1',
  popup_title: 'Free IELTS/PTE Demo Class!',
  popup_text: 'Get a FREE demo class and an honest assessment of your study abroad / visa chances — no strings attached. Limited seats every week.',
  popup_cta_text: 'Claim My Free Spot',
  popup_cta_link: '/register'
}

let cache: { data: SiteSettings; at: number } | null = null
const CACHE_TTL_MS = 60_000 // 1 minute in-isolate cache

export async function getSettings(db: D1Database, forceRefresh = false): Promise<SiteSettings> {
  if (!forceRefresh && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.data
  }

  const { results } = await db.prepare('SELECT key, value FROM site_settings').all<{
    key: string
    value: string
  }>()

  const merged: SiteSettings = { ...DEFAULT_SETTINGS }
  for (const row of results || []) {
    merged[row.key] = row.value
  }

  cache = { data: merged, at: Date.now() }
  return merged
}

export async function updateSettings(db: D1Database, updates: Record<string, string>): Promise<void> {
  const stmts = Object.entries(updates).map(([key, value]) =>
    db
      .prepare(
        `INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
      )
      .bind(key, value)
  )
  await db.batch(stmts)
  cache = null // invalidate
}

export function whatsappLink(whatsappNumber: string, message: string): string {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${whatsappNumber}?text=${encoded}`
}
