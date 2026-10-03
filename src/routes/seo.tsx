// =====================================================================
// sitemap.xml + robots.txt — dynamically generated from published
// content so every new country/news post is automatically indexed.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Country, NewsPost } from '../lib/types'

const seo = new Hono<{ Bindings: Bindings }>()

const BASE_URL = 'https://1stchoiceimmigration.com'

seo.get('/sitemap.xml', async (c) => {
  const [countriesRes, newsRes] = await Promise.all([
    c.env.DB.prepare('SELECT slug FROM countries WHERE is_published = 1').all<Pick<Country, 'slug'>>(),
    c.env.DB.prepare("SELECT slug, updated_at FROM news_posts WHERE status = 'published'").all<Pick<NewsPost, 'slug' | 'updated_at'>>()
  ])

  const staticUrls = [
    '/',
    '/coaching',
    '/study-abroad',
    '/visitor-visa',
    '/score-charts',
    '/register',
    '/education-loan',
    '/visa-results',
    '/reviews',
    '/news',
    '/contact',
    '/privacy-policy',
    '/terms'
  ]

  const countryUrls = (countriesRes.results || []).map((row) => `/study-abroad/${row.slug}`)
  const newsUrls = (newsRes.results || []).map((row) => ({ url: `/news/${row.slug}`, lastmod: row.updated_at }))

  const xmlEntries = [
    ...staticUrls.map((u) => `  <url><loc>${BASE_URL}${u}</loc><changefreq>weekly</changefreq></url>`),
    ...countryUrls.map((u) => `  <url><loc>${BASE_URL}${u}</loc><changefreq>monthly</changefreq></url>`),
    ...newsUrls.map((n) => `  <url><loc>${BASE_URL}${n.url}</loc><lastmod>${n.lastmod?.split(' ')[0] || ''}</lastmod><changefreq>monthly</changefreq></url>`)
  ].join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>`

  return c.body(xml, 200, { 'Content-Type': 'application/xml' })
})

seo.get('/robots.txt', (c) => {
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${BASE_URL}/sitemap.xml\n`
  return c.body(body, 200, { 'Content-Type': 'text/plain' })
})

export default seo
