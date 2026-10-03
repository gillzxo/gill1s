// =====================================================================
// Shared TypeScript types for Cloudflare bindings + domain models
// =====================================================================

export type Bindings = {
  DB: D1Database
  UPLOADS: R2Bucket
  // Secrets (set via `wrangler pages secret put` in production, or
  // .dev.vars locally). All optional — features degrade gracefully
  // when a key is not configured.
  RECAPTCHA_SECRET_KEY?: string
  RECAPTCHA_SITE_KEY?: string
  WHATSAPP_PHONE_NUMBER_ID?: string
  WHATSAPP_ACCESS_TOKEN?: string
  WHATSAPP_OWNER_NUMBER?: string
  RESEND_API_KEY?: string
  NOTIFY_EMAIL_TO?: string
  NOTIFY_EMAIL_FROM?: string
  GOOGLE_SHEETS_WEBHOOK_URL?: string
  GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?: string
  GOOGLE_SHEETS_PRIVATE_KEY?: string
  GOOGLE_SHEETS_SPREADSHEET_ID?: string
  GOOGLE_PLACES_API_KEY?: string
  GOOGLE_PLACE_ID?: string
  PUBLIC_BASE_URL?: string
  ADMIN_BOOTSTRAP_SECRET?: string
}

export interface Enquiry {
  id: number
  name: string
  phone: string
  email: string | null
  city: string | null
  service: 'Coaching' | 'Study Abroad' | 'Loan' | 'Visa' | 'Other'
  preferred_country: string | null
  last_qualification: string | null
  message: string | null
  consent: number
  source_page: string | null
  extra_json: string | null
  status: 'New' | 'Contacted' | 'Follow-up' | 'Converted' | 'Closed'
  assigned_to: number | null
  notes: string | null
  ip_address: string | null
  created_at: string
  updated_at: string
}

export interface VisaResult {
  id: number
  student_name: string
  country: string
  visa_type: string
  image_url: string
  visa_date: string | null
  is_published: number
  sort_order: number
  created_at: string
}

export interface CoachingResult {
  id: number
  student_name: string
  photo_url: string | null
  exam_type: string
  listening: number | null
  reading: number | null
  writing: number | null
  speaking: number | null
  overall_band: number
  batch: string | null
  is_published: number
  sort_order: number
  created_at: string
}

export interface NewsPost {
  id: number
  title: string
  slug: string
  category: 'Canada' | 'UK' | 'Australia' | 'USA' | 'General'
  cover_image_url: string | null
  excerpt: string | null
  content_html: string
  status: 'draft' | 'published' | 'scheduled'
  published_at: string | null
  author_id: number | null
  seo_title: string | null
  seo_description: string | null
  created_at: string
  updated_at: string
}

export interface Country {
  id: number
  name: string
  slug: string
  flag_emoji: string | null
  hero_image_url: string | null
  intro: string | null
  universities_json: string | null
  intakes: string | null
  avg_fees: string | null
  eligibility: string | null
  work_rights: string | null
  pr_pathway: string | null
  documents_json: string | null
  region: string | null
  is_published: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Review {
  id: number
  source: 'manual' | 'google' | 'instagram'
  author_name: string
  author_photo_url: string | null
  rating: number
  review_text: string
  review_date: string | null
  is_visible: number
  sort_order: number
  created_at: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  password_hash: string
  role: 'owner' | 'staff'
  is_active: number
  created_at: string
  last_login_at: string | null
}

export type SiteSettings = Record<string, string>
