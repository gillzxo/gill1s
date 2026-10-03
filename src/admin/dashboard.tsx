// =====================================================================
// Admin dashboard — today/week/month enquiry counts, counts by service,
// and a recent enquiries list. Other admin sections (Visa/Coaching
// Results, News, Countries, Reviews, Settings, Staff) are stubbed below
// with a consistent "coming soon" placeholder using the same layout so
// no link in the sidebar ever 404s — see README "Remaining Work" for
// the exact build-out plan for each.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Enquiry } from '../lib/types'
import { requireAdmin, requireOwner } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'

const dashboard = new Hono<{ Bindings: Bindings }>()

dashboard.use('*', requireAdmin)

dashboard.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser

  const [todayRes, weekRes, monthRes, byServiceRes, recentRes] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE date(created_at) = date('now')").first<{ cnt: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE created_at >= date('now','-7 days')").first<{ cnt: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE created_at >= date('now','start of month')").first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT service, COUNT(*) as cnt FROM enquiries GROUP BY service').all<{ service: string; cnt: number }>(),
    c.env.DB.prepare('SELECT * FROM enquiries ORDER BY created_at DESC LIMIT 10').all<Enquiry>()
  ])

  const byService = byServiceRes.results || []
  const recent = recentRes.results || []

  const content = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
      ${statCard('Enquiries Today', todayRes?.cnt ?? 0, 'fa-calendar-day', '#f70009')}
      ${statCard('This Week', weekRes?.cnt ?? 0, 'fa-calendar-week', '#0b2559')}
      ${statCard('This Month', monthRes?.cnt ?? 0, 'fa-calendar', '#16a34a')}
    </div>

    <div class="grid lg:grid-cols-3 gap-6 mb-8">
      <div class="admin-card lg:col-span-1">
        <h3 class="font-display font-bold text-brand-blue mb-4">Enquiries by Service</h3>
        <div class="space-y-3">
          ${byService
            .map(
              (s) => `
            <div class="flex items-center justify-between text-sm">
              <span class="text-slate-600 font-semibold">${escapeHtml(s.service)}</span>
              <span class="bg-red-50 text-brand-red font-bold px-3 py-1 rounded-full">${s.cnt}</span>
            </div>`
            )
            .join('') || '<p class="text-slate-400 text-sm">No enquiries yet.</p>'}
        </div>
      </div>

      <div class="admin-card lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-display font-bold text-brand-blue">Recent Enquiries</h3>
          <a href="/admin/enquiries" class="text-sm font-semibold text-brand-red">View All &rarr;</a>
        </div>
        <div class="overflow-x-auto">
          <table class="admin-table">
            <thead><tr><th>Name</th><th>Service</th><th>Status</th><th>Received</th></tr></thead>
            <tbody>
              ${
                recent
                  .map(
                    (e) => `
                <tr>
                  <td><p class="font-semibold text-slate-700">${escapeHtml(e.name)}</p><p class="text-xs text-slate-400">${escapeHtml(e.phone)}</p></td>
                  <td>${escapeHtml(e.service)}</td>
                  <td><span class="status-badge status-${e.status}">${e.status}</span></td>
                  <td class="text-xs text-slate-400">${escapeHtml(e.created_at)}</td>
                </tr>`
                  )
                  .join('') || '<tr><td colspan="4" class="text-center text-slate-400 py-8">No enquiries yet.</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="admin-card bg-blue-50 border-blue-100">
      <h3 class="font-display font-bold text-brand-blue mb-2"><i class="fa-solid fa-circle-info mr-2"></i>Welcome, ${escapeHtml(user.name)}!</h3>
      <p class="text-sm text-slate-600">Use the sidebar to manage enquiries, visa results, coaching results, news posts, study-abroad country pages, reviews, and site settings.</p>
    </div>
  `

  return c.html(AdminLayout({ title: 'Dashboard', user, activeNav: 'dashboard', children: content }))
})

function statCard(label: string, value: number, icon: string, color: string): string {
  return `
    <div class="admin-card flex items-center gap-4">
      <div class="w-14 h-14 rounded-xl flex items-center justify-center text-xl text-white" style="background:${color}">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div>
        <p class="text-2xl font-extrabold text-brand-blue font-display">${value}</p>
        <p class="text-xs text-slate-400 font-semibold uppercase">${label}</p>
      </div>
    </div>`
}

function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------
// Placeholder routes for sections not yet built out (see README).
// Each uses the same AdminLayout shell so navigation never 404s.
// ---------------------------------------------------------------------
const PLACEHOLDER_SECTIONS: { path: string; nav: string; title: string; ownerOnly?: boolean }[] = [
  { path: '/countries', nav: 'countries', title: 'Study Abroad Content' },
  { path: '/reviews', nav: 'reviews', title: 'Reviews Manager' },
  { path: '/settings', nav: 'settings', title: 'Site Settings' },
  { path: '/staff', nav: 'staff', title: 'Staff Accounts', ownerOnly: true }
]

for (const section of PLACEHOLDER_SECTIONS) {
  dashboard.get(section.path, section.ownerOnly ? requireOwner : requireAdmin, async (c) => {
    const user = c.get('adminUser' as never) as AdminSessionUser
    const content = `
      <div class="admin-card text-center py-16">
        <i class="fa-solid fa-screwdriver-wrench text-4xl text-slate-300 mb-4"></i>
        <h2 class="font-display font-bold text-xl text-brand-blue mb-2">${section.title} — Coming Soon</h2>
        <p class="text-slate-500 max-w-md mx-auto text-sm">
          This section's CRUD UI is the next build step. The database table, validation schema, and R2 upload
          helper for this feature already exist — only the admin screen needs wiring. See the README
          "Remaining Work" section for the exact plan.
        </p>
      </div>`
    return c.html(AdminLayout({ title: section.title, user, activeNav: section.nav, children: content }))
  })
}

export default dashboard
