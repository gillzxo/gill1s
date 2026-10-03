// =====================================================================
// Reviews page — Google rating summary, review cards (manual + Google),
// and an Instagram feed grid linking to the profile. The admin can
// paste a 3rd-party widget embed code (Elfsight/EmbedSocial) from
// Settings, which renders above the manual review cards if present.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Review } from '../lib/types'
import { PageHero, SectionHeading, StarRating } from '../components/shared'

const reviewsPage = new Hono<{ Bindings: Bindings }>()

// A handful of real public Instagram post URLs from the business profile,
// used purely as outbound links in the "feed grid" tiles (no scraping or
// embedding of private media — each tile just links out to Instagram).
const INSTAGRAM_POSTS = [
  { caption: 'PTE Success Story', url: 'https://www.instagram.com/reel/Dc97436Cbjm/' },
  { caption: 'Canada Study Visa Approved', url: 'https://www.instagram.com/p/C2PCXRKvblZ/' },
  { caption: 'IELTS Band 8 Achiever', url: 'https://www.instagram.com/reel/DYOlno0DwSr/' },
  { caption: 'Student Success Story', url: 'https://www.instagram.com/reel/DT2BZt1ko7K/' },
  { caption: 'UK Study Visa Update', url: 'https://www.instagram.com/reel/DX3BwpAD7Yi/' },
  { caption: 'PTE Results Day', url: 'https://www.instagram.com/reel/DXO00zHDJxr/' },
  { caption: 'Study Abroad Guidance', url: 'https://www.instagram.com/reel/DYLoGkLjiwp/' },
  { caption: 'Visa Approval Celebration', url: 'https://www.instagram.com/reel/DZfARwFt__c/' }
]

reviewsPage.get('/reviews', async (c) => {
  const settings = c.get('settings')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM reviews WHERE is_visible = 1 ORDER BY sort_order ASC, id DESC'
  ).all<Review>()
  const reviews = results || []

  const googleReviews = reviews.filter((r) => r.source === 'google' || r.source === 'manual')

  return c.render(
    <>
      <PageHero
        title="Reviews & Social Proof"
        subtitle="See what our students and their families say about their experience with us."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Reviews' }]}
      />

      {/* Google rating summary */}
      <section class="py-16">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="reveal bg-white rounded-2xl shadow-xl border border-slate-100 p-8 flex flex-col sm:flex-row items-center gap-8">
            <div class="text-center shrink-0">
              <div class="flex items-center gap-2 justify-center">
                <i class="fa-brands fa-google text-3xl text-blue-500"></i>
                <span class="text-5xl font-extrabold text-brand-blue font-display">{settings.google_rating}</span>
              </div>
              <StarRating rating={Math.round(parseFloat(settings.google_rating) || 5)} />
              <p class="text-slate-400 text-sm mt-2">{settings.google_review_count}+ Google Reviews</p>
            </div>
            <div class="flex-1 text-center sm:text-left">
              <h2 class="font-display text-xl font-bold text-brand-blue mb-2">Loved by Students Across Punjab</h2>
              <p class="text-slate-500 text-sm mb-4">
                We're proud of our {settings.google_rating}-star rating on Google, built on genuine advice, transparent
                processes, and real visa results.
              </p>
              <a
                href="https://www.google.com/search?q=1st+Choice+Ielts+%26+Immigration"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 border-2 border-brand-blue text-brand-blue font-bold px-5 py-2.5 rounded-full text-sm hover:bg-brand-blue hover:text-white transition-colors"
              >
                <i class="fa-brands fa-google"></i> Write a Google Review
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Optional 3rd-party widget embed (configured in Admin → Settings) */}
      {settings.reviews_widget_code ? (
        <section class="py-4">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" dangerouslySetInnerHTML={{ __html: settings.reviews_widget_code }}></div>
        </section>
      ) : null}

      {/* Review cards */}
      <section class="py-16 bg-slate-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="Testimonials" title="What Our Students Say" />
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {googleReviews.map((r) => (
              <div class="card-lift reveal bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                  <StarRating rating={r.rating} />
                  {r.source === 'google' ? <i class="fa-brands fa-google text-blue-500"></i> : null}
                </div>
                <p class="text-slate-600 text-sm leading-relaxed mb-4">&ldquo;{r.review_text}&rdquo;</p>
                <div class="flex items-center gap-3">
                  {r.author_photo_url ? (
                    <img src={r.author_photo_url} alt={r.author_name} class="w-10 h-10 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div class="w-10 h-10 rounded-full bg-brand-blue text-white flex items-center justify-center font-bold">
                      {r.author_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p class="font-bold text-slate-800 text-sm">{r.author_name}</p>
                    {r.review_date ? <p class="text-xs text-slate-400">{r.review_date}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram feed grid */}
      <section class="py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Follow Us"
            title="Our Instagram Feed"
            subtitle={
              <>
                See our latest success stories and updates —{' '}
                <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" class="text-brand-red font-semibold underline">
                  follow us on Instagram
                </a>
              </>
            }
          />

          {/* If the admin has pasted an Instagram embed widget code, render it; otherwise show the link grid */}
          {settings.instagram_embed_code ? (
            <div dangerouslySetInnerHTML={{ __html: settings.instagram_embed_code }}></div>
          ) : (
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {INSTAGRAM_POSTS.map((post) => (
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="card-lift reveal aspect-square rounded-xl bg-gradient-to-br from-brand-blue to-brand-bluelight flex flex-col items-center justify-center text-white p-4 text-center group"
                >
                  <i class="fa-brands fa-instagram text-3xl mb-2 group-hover:scale-110 transition-transform"></i>
                  <span class="text-xs font-semibold">{post.caption}</span>
                </a>
              ))}
            </div>
          )}

          <div class="text-center mt-10">
            <a
              href={settings.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold px-7 py-3.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <i class="fa-brands fa-instagram text-xl"></i> Follow @1stchoice_immigration
            </a>
          </div>
        </div>
      </section>
    </>,
    {
      title: 'Reviews',
      description: `Read genuine Google reviews and see Instagram success stories from ${settings.business_name} students in Bagha Purana, Moga.`
    }
  )
})

export default reviewsPage
