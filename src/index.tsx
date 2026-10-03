// =====================================================================
// App entry point — mounts all public pages, API routes, uploads route,
// SEO routes, and the admin portal.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from './lib/types'
import { renderer } from './renderer'
import { loadSettings } from './lib/middleware'

import home from './pages/home'
import coaching from './pages/coaching'
import studyAbroad from './pages/study-abroad'
import educationLoan from './pages/education-loan'
import visaResultsPage from './pages/visa-results'
import reviewsPage from './pages/reviews'
import newsPage from './pages/news'
import contactPage from './pages/contact'
import legal from './pages/legal'

import api from './routes/api'
import uploads from './routes/uploads'
import seo from './routes/seo'

import adminAuth from './admin/auth'
import adminDashboard from './admin/dashboard'

const app = new Hono<{ Bindings: Bindings }>()

// ---- Public site: settings + JSX renderer on every page ----
app.use('*', loadSettings)

// SEO + uploads (no renderer needed)
app.route('/', seo)
app.route('/uploads', uploads)

// Public API
app.route('/api', api)

// Admin portal (own HTML shell, not the public renderer)
app.route('/admin', adminAuth)
app.route('/admin', adminDashboard)

// Public pages (use the shared renderer)
app.use('*', renderer)
app.route('/', home)
app.route('/', coaching)
app.route('/', studyAbroad)
app.route('/', educationLoan)
app.route('/', visaResultsPage)
app.route('/', reviewsPage)
app.route('/', newsPage)
app.route('/', contactPage)
app.route('/', legal)

app.notFound((c) => {
  return c.render(
    <div class="max-w-xl mx-auto px-4 py-32 text-center">
      <h1 class="font-display text-6xl font-extrabold text-brand-blue mb-4">404</h1>
      <p class="text-slate-500 mb-8">Sorry, the page you're looking for doesn't exist.</p>
      <a href="/" class="inline-flex items-center gap-2 bg-brand-red text-white font-bold px-6 py-3 rounded-full">
        Back to Home
      </a>
    </div>,
    { title: 'Page Not Found', noindex: true }
  )
})

export default app
