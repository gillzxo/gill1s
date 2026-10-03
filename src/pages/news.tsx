// =====================================================================
// News & Immigration Updates — category-filterable list + SEO-friendly
// individual article pages (slug-based URLs) with full schema.org
// Article markup.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, NewsPost } from '../lib/types'
import { PageHero, SectionHeading } from '../components/shared'

const newsPage = new Hono<{ Bindings: Bindings }>()

const CATEGORIES = ['Canada', 'UK', 'Australia', 'USA', 'General']

newsPage.get('/news', async (c) => {
  const settings = c.get('settings')
  const category = c.req.query('category') || ''
  const q = (c.req.query('q') || '').trim()

  let query = "SELECT * FROM news_posts WHERE status = 'published'"
  const binds: string[] = []
  if (category && CATEGORIES.includes(category)) {
    query += ' AND category = ?'
    binds.push(category)
  }
  if (q) {
    query += ' AND (title LIKE ? OR excerpt LIKE ?)'
    binds.push(`%${q}%`, `%${q}%`)
  }
  query += ' ORDER BY published_at DESC LIMIT 50'

  const { results } = await c.env.DB.prepare(query)
    .bind(...binds)
    .all<NewsPost>()
  const posts = results || []

  return c.render(
    <>
      <PageHero
        title="News & Immigration Updates"
        subtitle="Stay informed with the latest visa rules, intakes, and country-specific news."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'News' }]}
      />

      <section class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search + category filters */}
          <form method="get" class="flex flex-col sm:flex-row gap-4 mb-10 reveal">
            <div class="relative flex-1">
              <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="search"
                name="q"
                value={q}
                placeholder="Search news & updates..."
                class="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none"
              />
            </div>
            <select name="category" class="px-4 py-3 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700">
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option value={cat} selected={cat === category}>
                  {cat}
                </option>
              ))}
            </select>
            <button type="submit" class="bg-brand-blue text-white font-bold px-6 py-3 rounded-lg hover:bg-brand-bluelight transition-colors">
              Search
            </button>
          </form>

          {/* Category pills */}
          <div class="flex flex-wrap gap-2 mb-10">
            <a href="/news" class={`px-4 py-2 rounded-full text-sm font-semibold ${!category ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-600'}`}>
              All
            </a>
            {CATEGORIES.map((cat) => (
              <a
                href={`/news?category=${encodeURIComponent(cat)}`}
                class={`px-4 py-2 rounded-full text-sm font-semibold ${category === cat ? 'bg-brand-red text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {cat}
              </a>
            ))}
          </div>

          {posts.length === 0 ? (
            <div class="text-center py-20 text-slate-400">
              <i class="fa-solid fa-newspaper text-4xl mb-3"></i>
              <p>No articles found. Try a different search or category.</p>
            </div>
          ) : (
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <a href={`/news/${post.slug}`} class="card-lift reveal block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt={post.title} class="w-full h-44 object-cover" loading="lazy" width="400" height="176" />
                  ) : (
                    <div class="w-full h-44 bg-gradient-to-br from-brand-blue to-brand-bluelight flex items-center justify-center text-white font-display font-bold text-xl">
                      {post.category}
                    </div>
                  )}
                  <div class="p-5">
                    <span class="text-xs font-bold text-brand-red uppercase tracking-wide">{post.category}</span>
                    <h3 class="font-display font-bold text-brand-blue mt-2 leading-snug line-clamp-2">{post.title}</h3>
                    <p class="text-slate-500 text-sm mt-2 line-clamp-2">{post.excerpt}</p>
                    <p class="text-xs text-slate-400 mt-3">{formatDate(post.published_at)}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>,
    {
      title: category ? `${category} News` : 'News & Immigration Updates',
      description: `Latest ${category || 'immigration'} news and study abroad updates from ${settings.business_name}.`
    }
  )
})

newsPage.get('/news/:slug', async (c) => {
  const settings = c.get('settings')
  const slug = c.req.param('slug')

  const post = await c.env.DB.prepare("SELECT * FROM news_posts WHERE slug = ? AND status = 'published'")
    .bind(slug)
    .first<NewsPost>()

  if (!post) return c.notFound()

  const { results: related } = await c.env.DB.prepare(
    "SELECT * FROM news_posts WHERE status = 'published' AND category = ? AND id != ? ORDER BY published_at DESC LIMIT 3"
  )
    .bind(post.category, post.id)
    .all<NewsPost>()

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: post.cover_image_url ? [post.cover_image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { '@type': 'Organization', name: settings.business_name },
    publisher: { '@type': 'Organization', name: settings.business_name },
    description: post.seo_description || post.excerpt || undefined
  }

  return c.render(
    <>
      <PageHero
        title={post.title}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'News', href: '/news' }, { label: post.category, href: `/news?category=${post.category}` }]}
      />

      <article class="py-16">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3 text-sm text-slate-400 mb-6">
            <span class="bg-red-50 text-brand-red font-bold px-3 py-1 rounded-full text-xs uppercase">{post.category}</span>
            <span>{formatDate(post.published_at)}</span>
          </div>

          {post.cover_image_url ? (
            <img src={post.cover_image_url} alt={post.title} class="w-full rounded-2xl mb-8 max-h-96 object-cover" width="768" height="384" />
          ) : null}

          <div class="prose-content" dangerouslySetInnerHTML={{ __html: post.content_html }}></div>

          <div class="mt-12 bg-brand-blue rounded-2xl p-8 text-center">
            <h3 class="font-display text-xl font-bold text-white mb-3">Have Questions About This Update?</h3>
            <p class="text-slate-300 mb-6">Talk to our expert counsellors for personalised guidance.</p>
            <a href="/contact" class="inline-flex items-center gap-2 bg-brand-red hover:bg-brand-reddark text-white font-bold px-7 py-3.5 rounded-full transition-colors">
              <i class="fa-solid fa-calendar-check"></i> Free Consultation
            </a>
          </div>
        </div>
      </article>

      {related && related.length > 0 ? (
        <section class="py-16 bg-slate-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Keep Reading" title="Related Articles" />
            <div class="grid sm:grid-cols-3 gap-6">
              {related.map((p) => (
                <a href={`/news/${p.slug}`} class="card-lift reveal block bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  {p.cover_image_url ? (
                    <img src={p.cover_image_url} alt={p.title} class="w-full h-36 object-cover" loading="lazy" />
                  ) : (
                    <div class="w-full h-36 bg-gradient-to-br from-brand-blue to-brand-bluelight"></div>
                  )}
                  <div class="p-4">
                    <h3 class="font-display font-bold text-brand-blue text-sm leading-snug line-clamp-2">{p.title}</h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>,
    {
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      ogImage: post.cover_image_url || undefined,
      jsonLd: [articleLd]
    }
  )
})

function formatDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return iso
  }
}

export default newsPage
