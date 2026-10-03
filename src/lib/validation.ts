// =====================================================================
// Zod schemas — shared client/server validation
// =====================================================================
import { z } from 'zod'

// Indian mobile numbers: optional +91 / 0 prefix, then a 10-digit
// number starting with 6-9.
const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/

export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name').max(120),
  phone: z
    .string()
    .trim()
    .regex(INDIAN_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  city: z.string().trim().max(120).optional().or(z.literal('')),
  service: z.enum(['Coaching', 'Study Abroad', 'Loan', 'Visa', 'Other']),
  preferred_country: z.string().trim().max(120).optional().or(z.literal('')),
  last_qualification: z.string().trim().max(120).optional().or(z.literal('')),
  message: z.string().trim().max(2000).optional().or(z.literal('')),
  consent: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .transform((v) => v === 'on' || v === 'true' || v === true)
    .refine((v) => v === true, 'Please accept the consent checkbox'),
  source_page: z.string().trim().max(200).optional().or(z.literal('')),
  extra_json: z.string().trim().max(4000).optional().or(z.literal('')),
  // Honeypot — must stay empty. Bots that auto-fill every field get caught here.
  website: z.string().max(0, 'Spam detected').optional().or(z.literal('')),
  // reCAPTCHA v3 token (optional — validated server-side only if a secret key is configured)
  recaptcha_token: z.string().optional().or(z.literal(''))
})

export type EnquiryInput = z.infer<typeof enquirySchema>

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

export const visaResultSchema = z.object({
  student_name: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(60),
  visa_type: z.string().trim().min(2).max(60),
  visa_date: z.string().trim().max(40).optional().or(z.literal('')),
  is_published: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .transform((v) => (v === 'on' || v === 'true' || v === true ? 1 : 0))
    .default(false as any)
})

export const coachingResultSchema = z.object({
  student_name: z.string().trim().min(2).max(120),
  exam_type: z.string().trim().min(2).max(40),
  listening: z.coerce.number().min(0).max(100).optional(),
  reading: z.coerce.number().min(0).max(100).optional(),
  writing: z.coerce.number().min(0).max(100).optional(),
  speaking: z.coerce.number().min(0).max(100).optional(),
  overall_band: z.coerce.number().min(0).max(100),
  batch: z.string().trim().max(80).optional().or(z.literal('')),
  is_published: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .transform((v) => (v === 'on' || v === 'true' || v === true ? 1 : 0))
    .default(false as any)
})

export const newsPostSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  category: z.enum(['Canada', 'UK', 'Australia', 'USA', 'General']),
  excerpt: z.string().trim().max(500).optional().or(z.literal('')),
  content_html: z.string().min(10),
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().or(z.literal('')),
  seo_title: z.string().trim().max(200).optional().or(z.literal('')),
  seo_description: z.string().trim().max(300).optional().or(z.literal(''))
})

export const reviewSchema = z.object({
  source: z.enum(['manual', 'google', 'instagram']),
  author_name: z.string().trim().min(2).max(120),
  rating: z.coerce.number().min(1).max(5),
  review_text: z.string().trim().min(5).max(2000),
  review_date: z.string().trim().max(40).optional().or(z.literal('')),
  is_visible: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .transform((v) => (v === 'on' || v === 'true' || v === true ? 1 : 0))
    .default(false as any)
})

export const countrySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  flag_emoji: z.string().trim().max(8).optional().or(z.literal('')),
  intro: z.string().trim().max(2000).optional().or(z.literal('')),
  intakes: z.string().trim().max(200).optional().or(z.literal('')),
  avg_fees: z.string().trim().max(200).optional().or(z.literal('')),
  eligibility: z.string().trim().max(1000).optional().or(z.literal('')),
  work_rights: z.string().trim().max(1000).optional().or(z.literal('')),
  pr_pathway: z.string().trim().max(1000).optional().or(z.literal('')),
  universities_json: z.string().trim().max(5000).optional().or(z.literal('')),
  documents_json: z.string().trim().max(5000).optional().or(z.literal('')),
  is_published: z
    .union([z.literal('on'), z.literal('true'), z.boolean()])
    .transform((v) => (v === 'on' || v === 'true' || v === true ? 1 : 0))
    .default(false as any)
})

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join('; ')
}
