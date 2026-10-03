// =====================================================================
// Admin Enquiries Manager — list with search/filters, status updates,
// notes, staff assignment, CSV export, and quick WhatsApp/call actions.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Enquiry, AdminUser } from '../lib/types'
import { requireAdmin } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'
import { logActivity } from '../lib/log'
import { getClientIp } from '../lib/ratelimit'
import { whatsappLink } from '../lib/settings'

const enquiries = new Hono<{ Bindings: Bindings }>()

enquiries.use('*', requireAdmin)

const STATUSES = ['New', 'Contacted', 'Follow-up', 'Converted', 'Closed']
const SERVICES = ['Coaching', 'Study Abroad', 'Loan', 'Visa', 'Other']

function escapeHtml(str: string | null | undefined): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(str: string | null | undefined): string {
  return escapeHtml(str).replace(/\n/g, '&#10;')
}

interface NoteEntry {
  by: string
  at: string
  text: string
}

function parseNotes(json: string | null): NoteEntry[] {
  if (!json) return []
  try {
    return JSON.parse(json) as NoteEntry[]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------
// LIST + FILTERS
// ---------------------------------------------------------------------
enquiries.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser

  const status = c.req.query('status') || ''
  const service = c.req.query('service') || ''
  const dateFrom = c.req.query('from') || ''
  const dateTo = c.req.query('to') || ''
  const q = (c.req.query('q') || '').trim()
  const page = Math.max(parseInt(c.req.query('page') || '1', 10), 1)
  const perPage = 20

  let where = 'WHERE 1=1'
  const binds: (string | number)[] = []

  if (status && STATUSES.includes(status)) {
    where += ' AND e.status = ?'
    binds.push(status)
  }
  if (service && SERVICES.includes(service)) {
    where += ' AND e.service = ?'
    binds.push(service)
  }
  if (dateFrom) {
    where += ' AND date(e.created_at) >= date(?)'
    binds.push(dateFrom)
  }
  if (dateTo) {
    where += ' AND date(e.created_at) <= date(?)'
    binds.push(dateTo)
  }
  if (q) {
    where += ' AND (e.name LIKE ? OR e.phone LIKE ? OR e.email LIKE ?)'
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM enquiries e ${where}`)
    .bind(...binds)
    .first<{ cnt: number }>()
  const total = countRow?.cnt ?? 0
  const totalPages = Math.max(Math.ceil(total / perPage), 1)

  const { results } = await c.env.DB.prepare(
    `SELECT e.*, a.name as assigned_name FROM enquiries e LEFT JOIN admin_users a ON a.id = e.assigned_to ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...binds, perPage, (page - 1) * perPage)
    .all<Enquiry & { assigned_name: string | null }>()

  const list = results || []

  const { results: staffList } = await c.env.DB.prepare('SELECT id, name FROM admin_users WHERE is_active = 1 ORDER BY name').all<{
    id: number
    name: string
  }>()
  const staff = staffList || []

  const qs = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ status, service, from: dateFrom, to: dateTo, q, ...overrides })
    for (const [k, v] of Array.from(params.entries())) if (!v) params.delete(k)
    return params.toString()
  }

  const content = `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <form method="get" class="flex flex-wrap gap-3 flex-1">
        <input type="search" name="q" value="${escapeAttr(q)}" placeholder="Search name, phone, email..." class="admin-input max-w-xs" />
        <select name="status" class="admin-input w-auto">
          <option value="">All Status</option>
          ${STATUSES.map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select name="service" class="admin-input w-auto">
          <option value="">All Services</option>
          ${SERVICES.map((s) => `<option value="${s}" ${service === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <input type="date" name="from" value="${escapeAttr(dateFrom)}" class="admin-input w-auto" />
        <input type="date" name="to" value="${escapeAttr(dateTo)}" class="admin-input w-auto" />
        <button type="submit" class="admin-btn-secondary">
          <i class="fa-solid fa-filter"></i> Filter
        </button>
        ${status || service || dateFrom || dateTo || q ? '<a href="/admin/enquiries" class="admin-btn-secondary">Clear</a>' : ''}
      </form>
      <a href="/admin/enquiries/export?${qs({})}" class="admin-btn-primary shrink-0">
        <i class="fa-solid fa-download"></i> Export CSV
      </a>
    </div>

    <div class="admin-card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Service</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Received</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              list
                .map((e) => {
                  const waMsg = `Hi ${e.name}, this is ${escapeHtml(user.name)} from 1st Choice IELTS & Immigration regarding your enquiry.`
                  const waLink = whatsappLink(e.phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91'), waMsg)
                  return `
                <tr>
                  <td>
                    <a href="/admin/enquiries/${e.id}" class="font-semibold text-brand-blue hover:text-brand-red">${escapeHtml(e.name)}</a>
                    <p class="text-xs text-slate-400">${escapeHtml(e.phone)}${e.city ? ' · ' + escapeHtml(e.city) : ''}</p>
                  </td>
                  <td>${escapeHtml(e.service)}${e.preferred_country ? `<p class="text-xs text-slate-400">${escapeHtml(e.preferred_country)}</p>` : ''}</td>
                  <td><span class="status-badge status-${e.status}">${e.status}</span></td>
                  <td class="text-xs text-slate-500">${escapeHtml(e.assigned_name || '—')}</td>
                  <td class="text-xs text-slate-400 whitespace-nowrap">${escapeHtml(e.created_at)}</td>
                  <td>
                    <div class="flex gap-2">
                      <a href="/admin/enquiries/${e.id}" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="View"><i class="fa-solid fa-eye text-xs"></i></a>
                      <a href="tel:${escapeAttr(e.phone)}" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600" title="Call"><i class="fa-solid fa-phone text-xs"></i></a>
                      <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center text-green-600" title="WhatsApp"><i class="fa-brands fa-whatsapp text-xs"></i></a>
                    </div>
                  </td>
                </tr>`
                })
                .join('') ||
              `<tr><td colspan="6" class="text-center text-slate-400 py-12"><i class="fa-solid fa-inbox text-3xl mb-2 block"></i>No enquiries match your filters.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    ${
      totalPages > 1
        ? `<div class="flex items-center justify-between mt-5 text-sm text-slate-500">
            <span>Page ${page} of ${totalPages} (${total} total)</span>
            <div class="flex gap-2">
              ${page > 1 ? `<a href="?${qs({ page: String(page - 1) })}" class="admin-btn-secondary !py-2 !px-4">&larr; Previous</a>` : ''}
              ${page < totalPages ? `<a href="?${qs({ page: String(page + 1) })}" class="admin-btn-secondary !py-2 !px-4">Next &rarr;</a>` : ''}
            </div>
          </div>`
        : ''
    }
  `

  return c.html(AdminLayout({ title: 'Enquiries Manager', user, activeNav: 'enquiries', children: content }))
})

// ---------------------------------------------------------------------
// CSV EXPORT
// ---------------------------------------------------------------------
enquiries.get('/export', async (c) => {
  const status = c.req.query('status') || ''
  const service = c.req.query('service') || ''
  const dateFrom = c.req.query('from') || ''
  const dateTo = c.req.query('to') || ''
  const q = (c.req.query('q') || '').trim()

  let where = 'WHERE 1=1'
  const binds: string[] = []
  if (status) {
    where += ' AND status = ?'
    binds.push(status)
  }
  if (service) {
    where += ' AND service = ?'
    binds.push(service)
  }
  if (dateFrom) {
    where += ' AND date(created_at) >= date(?)'
    binds.push(dateFrom)
  }
  if (dateTo) {
    where += ' AND date(created_at) <= date(?)'
    binds.push(dateTo)
  }
  if (q) {
    where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }

  const { results } = await c.env.DB.prepare(`SELECT * FROM enquiries ${where} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<Enquiry>()
  const rows = results || []

  const header = [
    'ID',
    'Name',
    'Phone',
    'Email',
    'City',
    'Service',
    'Preferred Country',
    'Last Qualification',
    'Message',
    'Status',
    'Source Page',
    'Created At'
  ]

  function csvEscape(val: unknown): string {
    const str = val === null || val === undefined ? '' : String(val)
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
    return str
  }

  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.name,
        r.phone,
        r.email,
        r.city,
        r.service,
        r.preferred_country,
        r.last_qualification,
        r.message,
        r.status,
        r.source_page,
        r.created_at
      ]
        .map(csvEscape)
        .join(',')
    )
  }

  const csv = lines.join('\n')
  return c.body(csv, 200, {
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="enquiries-${new Date().toISOString().slice(0, 10)}.csv"`
  })
})

// ---------------------------------------------------------------------
// DETAIL VIEW — status update, notes, assign
// ---------------------------------------------------------------------
enquiries.get('/:id', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')

  const enquiry = await c.env.DB.prepare('SELECT * FROM enquiries WHERE id = ?').bind(id).first<Enquiry>()
  if (!enquiry) return c.notFound()

  const { results: staffList } = await c.env.DB.prepare('SELECT id, name FROM admin_users WHERE is_active = 1 ORDER BY name').all<{
    id: number
    name: string
  }>()
  const staff = staffList || []

  const notes = parseNotes(enquiry.notes)
  const waLink = whatsappLink(
    enquiry.phone.replace(/\D/g, '').replace(/^0/, '91').replace(/^(?!91)/, '91'),
    `Hi ${enquiry.name}, this is ${user.name} from 1st Choice IELTS & Immigration regarding your enquiry.`
  )

  let extraInfo = ''
  if (enquiry.extra_json) {
    try {
      const extra = JSON.parse(enquiry.extra_json)
      extraInfo = `<div class="bg-amber-50 border border-amber-100 rounded-lg p-4 text-xs text-amber-800 mb-4"><strong>Calculator data:</strong> ${escapeHtml(
        JSON.stringify(extra)
      )}</div>`
    } catch {
      /* ignore */
    }
  }

  const content = `
    <a href="/admin/enquiries" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to Enquiries</a>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="admin-card">
          <div class="flex items-start justify-between mb-5">
            <div>
              <h2 class="font-display font-bold text-xl text-brand-blue">${escapeHtml(enquiry.name)}</h2>
              <p class="text-slate-400 text-sm">Enquiry #${enquiry.id} · ${escapeHtml(enquiry.created_at)}</p>
            </div>
            <span class="status-badge status-${enquiry.status}">${enquiry.status}</span>
          </div>

          ${extraInfo}

          <dl class="grid sm:grid-cols-2 gap-4 text-sm mb-5">
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Phone</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.phone)}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Email</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.email || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">City</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.city || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Service</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.service)}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Preferred Country</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.preferred_country || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Last Qualification</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.last_qualification || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Source Page</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.source_page || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">IP Address</dt><dd class="font-semibold text-slate-700">${escapeHtml(enquiry.ip_address || '-')}</dd></div>
          </dl>

          <div class="mb-5">
            <dt class="text-slate-400 text-xs font-semibold uppercase mb-1">Message</dt>
            <dd class="text-slate-600 bg-slate-50 rounded-lg p-4 text-sm">${escapeHtml(enquiry.message || 'No message provided.')}</dd>
          </div>

          <div class="flex flex-wrap gap-3">
            <a href="tel:${escapeAttr(enquiry.phone)}" class="admin-btn-secondary"><i class="fa-solid fa-phone"></i> Call</a>
            <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="admin-btn-primary !bg-[#25d366] hover:!bg-[#1ebe5a]"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
          </div>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Notes &amp; Follow-up History</h3>
          <div class="space-y-3 mb-5 max-h-80 overflow-y-auto">
            ${
              notes.length
                ? notes
                    .slice()
                    .reverse()
                    .map(
                      (n) => `
              <div class="bg-slate-50 rounded-lg p-3 text-sm">
                <p class="text-slate-700">${escapeHtml(n.text)}</p>
                <p class="text-xs text-slate-400 mt-1">${escapeHtml(n.by)} · ${escapeHtml(n.at)}</p>
              </div>`
                    )
                    .join('')
                : '<p class="text-slate-400 text-sm">No notes yet.</p>'
            }
          </div>
          <form method="post" action="/admin/enquiries/${enquiry.id}/note" class="flex gap-2">
            <input type="text" name="text" required placeholder="Add a follow-up note..." class="admin-input flex-1" />
            <button type="submit" class="admin-btn-primary shrink-0"><i class="fa-solid fa-plus"></i> Add</button>
          </form>
        </div>
      </div>

      <div class="space-y-6">
        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Update Status</h3>
          <form method="post" action="/admin/enquiries/${enquiry.id}/status" class="space-y-3">
            <select name="status" class="admin-input">
              ${STATUSES.map((s) => `<option value="${s}" ${enquiry.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button type="submit" class="admin-btn-primary w-full justify-center">Save Status</button>
          </form>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Assign To</h3>
          <form method="post" action="/admin/enquiries/${enquiry.id}/assign" class="space-y-3">
            <select name="assigned_to" class="admin-input">
              <option value="">Unassigned</option>
              ${staff.map((s) => `<option value="${s.id}" ${enquiry.assigned_to === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
            </select>
            <button type="submit" class="admin-btn-secondary w-full justify-center">Save Assignment</button>
          </form>
        </div>
      </div>
    </div>
  `

  return c.html(AdminLayout({ title: `Enquiry: ${enquiry.name}`, user, activeNav: 'enquiries', children: content }))
})

// ---------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------
enquiries.post('/:id/status', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const status = String(formData.get('status') || '')

  if (!STATUSES.includes(status)) return c.text('Invalid status', 400)

  await c.env.DB.prepare("UPDATE enquiries SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id).run()
  await logActivity(c.env.DB, user, 'enquiry.status_update', 'enquiries', id, { status }, getClientIp(c.req.raw))

  return c.redirect(`/admin/enquiries/${id}`)
})

enquiries.post('/:id/assign', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const assignedTo = formData.get('assigned_to')
  const value = assignedTo ? parseInt(String(assignedTo), 10) : null

  await c.env.DB.prepare("UPDATE enquiries SET assigned_to = ?, updated_at = datetime('now') WHERE id = ?").bind(value, id).run()
  await logActivity(c.env.DB, user, 'enquiry.assign', 'enquiries', id, { assigned_to: value }, getClientIp(c.req.raw))

  return c.redirect(`/admin/enquiries/${id}`)
})

enquiries.post('/:id/note', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const text = String(formData.get('text') || '').trim()

  if (!text) return c.redirect(`/admin/enquiries/${id}`)

  const existing = await c.env.DB.prepare('SELECT notes FROM enquiries WHERE id = ?').bind(id).first<{ notes: string | null }>()
  const notes = parseNotes(existing?.notes ?? null)
  notes.push({ by: user.name, at: new Date().toISOString(), text })

  await c.env.DB.prepare("UPDATE enquiries SET notes = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(JSON.stringify(notes), id)
    .run()
  await logActivity(c.env.DB, user, 'enquiry.note_add', 'enquiries', id, { text }, getClientIp(c.req.raw))

  return c.redirect(`/admin/enquiries/${id}`)
})

export default enquiries
