// =====================================================================
// Admin Coaching Results Manager — student band-score cards with photo
// upload, publish/unpublish, reorder, edit, delete.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, CoachingResult } from '../lib/types'
import { requireAdmin } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'
import { logActivity } from '../lib/log'
import { getClientIp } from '../lib/ratelimit'
import { coachingResultSchema } from '../lib/validation'

const coachingResults = new Hono<{ Bindings: Bindings }>()

coachingResults.use('*', requireAdmin)

function escapeHtml(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str: string | number | null | undefined): string {
  return escapeHtml(str).replace(/\n/g, '&#10;')
}

// ---------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------
coachingResults.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const flash = c.req.query('flash') || ''

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM coaching_results ORDER BY sort_order ASC, created_at DESC'
  ).all<CoachingResult>()
  const list = results || []

  const content = `
    ${flash ? `<div class="admin-card bg-green-50 border-green-100 text-green-700 text-sm mb-5"><i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(flash)}</div>` : ''}

    <div class="flex items-center justify-between mb-6">
      <p class="text-slate-500 text-sm">${list.length} result${list.length === 1 ? '' : 's'} total.</p>
      <a href="/admin/coaching-results/new" class="admin-btn-primary"><i class="fa-solid fa-plus"></i> Add Coaching Result</a>
    </div>

    <div class="admin-card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam</th>
              <th>L / R / W / S</th>
              <th>Overall Band</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              list
                .map(
                  (r, idx) => `
              <tr>
                <td>
                  <div class="flex items-center gap-3">
                    ${r.photo_url ? `<img src="${escapeAttr(r.photo_url)}" class="w-10 h-10 rounded-full object-cover" />` : `<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>`}
                    <span class="font-semibold text-slate-700">${escapeHtml(r.student_name)}</span>
                  </div>
                </td>
                <td>${escapeHtml(r.exam_type)}</td>
                <td class="text-xs text-slate-500">${escapeHtml(r.listening ?? '-')} / ${escapeHtml(r.reading ?? '-')} / ${escapeHtml(r.writing ?? '-')} / ${escapeHtml(r.speaking ?? '-')}</td>
                <td class="font-bold text-brand-red">${escapeHtml(r.overall_band)}</td>
                <td class="text-xs text-slate-500">${escapeHtml(r.batch || '-')}</td>
                <td><span class="status-badge ${r.is_published ? 'status-Converted' : 'status-Closed'}">${r.is_published ? 'Published' : 'Hidden'}</span></td>
                <td>
                  <div class="flex gap-2 flex-wrap">
                    <a href="/admin/coaching-results/${r.id}/edit" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="Edit"><i class="fa-solid fa-pen text-xs"></i></a>
                    <form method="post" action="/admin/coaching-results/${r.id}/toggle-publish" class="inline"><button type="submit" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600" title="${r.is_published ? 'Unpublish' : 'Publish'}"><i class="fa-solid fa-${r.is_published ? 'eye-slash' : 'eye'} text-xs"></i></button></form>
                    ${idx > 0 ? `<form method="post" action="/admin/coaching-results/${r.id}/move-up" class="inline"><button type="submit" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="Move up"><i class="fa-solid fa-arrow-up text-xs"></i></button></form>` : ''}
                    ${idx < list.length - 1 ? `<form method="post" action="/admin/coaching-results/${r.id}/move-down" class="inline"><button type="submit" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="Move down"><i class="fa-solid fa-arrow-down text-xs"></i></button></form>` : ''}
                    <form method="post" action="/admin/coaching-results/${r.id}/delete" class="inline"><button type="submit" data-confirm-delete="Delete this coaching result permanently?" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600" title="Delete"><i class="fa-solid fa-trash text-xs"></i></button></form>
                  </div>
                </td>
              </tr>`
                )
                .join('') ||
              `<tr><td colspan="7" class="text-center text-slate-400 py-12"><i class="fa-solid fa-graduation-cap text-3xl mb-2 block"></i>No coaching results yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `

  return c.html(AdminLayout({ title: 'Coaching Results Manager', user, activeNav: 'coaching-results', children: content }))
})

// ---------------------------------------------------------------------
// FORM
// ---------------------------------------------------------------------
function resultForm(r: Partial<CoachingResult> | null, error?: string): string {
  const isEdit = !!r?.id
  return `
    <a href="/admin/coaching-results" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to Coaching Results</a>

    <div class="admin-card max-w-2xl">
      ${error ? `<div class="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${escapeHtml(error)}</div>` : ''}
      <form method="post" action="${isEdit ? `/admin/coaching-results/${r!.id}/edit` : '/admin/coaching-results/new'}" class="space-y-4">
        <div>
          <label class="admin-label">Student Photo (optional)</label>
          <div class="dropzone" data-dropzone data-folder="coaching-results">
            <input type="file" accept="image/*" class="hidden" data-dropzone-input />
            <img data-dropzone-preview class="${r?.photo_url ? '' : 'hidden'} mx-auto mb-3 max-h-32 rounded-full object-cover" ${r?.photo_url ? `src="${escapeAttr(r.photo_url)}"` : ''} />
            <p data-dropzone-prompt class="text-sm text-slate-400"><i class="fa-solid fa-cloud-arrow-up text-2xl block mb-2 text-slate-300"></i>${r?.photo_url ? 'Photo uploaded! Click to replace.' : 'Click or drag a photo here (optional)'}</p>
          </div>
          <input type="hidden" name="photo_url" data-dropzone-target value="${escapeAttr(r?.photo_url)}" />
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Student Name *</label>
            <input type="text" name="student_name" required value="${escapeAttr(r?.student_name)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Exam Type *</label>
            <select name="exam_type" required class="admin-input">
              ${['IELTS', 'PTE', 'CELPIP', 'TOEFL', 'Spoken English', 'Other']
                .map((t) => `<option value="${t}" ${r?.exam_type === t ? 'selected' : ''}>${t}</option>`)
                .join('')}
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label class="admin-label">Listening</label>
            <input type="number" step="0.5" min="0" max="100" name="listening" value="${escapeAttr(r?.listening)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Reading</label>
            <input type="number" step="0.5" min="0" max="100" name="reading" value="${escapeAttr(r?.reading)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Writing</label>
            <input type="number" step="0.5" min="0" max="100" name="writing" value="${escapeAttr(r?.writing)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Speaking</label>
            <input type="number" step="0.5" min="0" max="100" name="speaking" value="${escapeAttr(r?.speaking)}" class="admin-input" />
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Overall Band / Score *</label>
            <input type="number" step="0.5" min="0" max="100" name="overall_band" required value="${escapeAttr(r?.overall_band)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Batch</label>
            <input type="text" name="batch" placeholder="e.g. Morning Batch - Sept 2025" value="${escapeAttr(r?.batch)}" class="admin-input" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" name="is_published" ${r?.is_published || !isEdit ? 'checked' : ''} class="w-4 h-4" />
          Publish immediately (visible on the public Coaching page)
        </label>

        <div class="flex gap-3 pt-2">
          <button type="submit" class="admin-btn-primary"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Save Changes' : 'Add Result'}</button>
          <a href="/admin/coaching-results" class="admin-btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `
}

coachingResults.get('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  return c.html(AdminLayout({ title: 'Add Coaching Result', user, activeNav: 'coaching-results', children: resultForm(null) }))
})

coachingResults.post('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = coachingResultSchema.safeParse(raw)

  if (!parsed.success) {
    const err = parsed.error.issues.map((i) => i.message).join('; ')
    return c.html(
      AdminLayout({ title: 'Add Coaching Result', user, activeNav: 'coaching-results', children: resultForm(raw as any, err) }),
      400
    )
  }

  const maxOrderRow = await c.env.DB.prepare('SELECT MAX(sort_order) as m FROM coaching_results').first<{ m: number | null }>()
  const nextOrder = (maxOrderRow?.m ?? -1) + 1
  const photoUrl = String(formData.get('photo_url') || '') || null

  const result = await c.env.DB.prepare(
    `INSERT INTO coaching_results (student_name, photo_url, exam_type, listening, reading, writing, speaking, overall_band, batch, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      parsed.data.student_name,
      photoUrl,
      parsed.data.exam_type,
      parsed.data.listening ?? null,
      parsed.data.reading ?? null,
      parsed.data.writing ?? null,
      parsed.data.speaking ?? null,
      parsed.data.overall_band,
      parsed.data.batch || null,
      parsed.data.is_published,
      nextOrder
    )
    .run()

  await logActivity(c.env.DB, user, 'coaching_result.create', 'coaching_results', result.meta.last_row_id, { student_name: parsed.data.student_name }, getClientIp(c.req.raw))

  return c.redirect('/admin/coaching-results?flash=Coaching result added successfully.')
})

coachingResults.get('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const r = await c.env.DB.prepare('SELECT * FROM coaching_results WHERE id = ?').bind(id).first<CoachingResult>()
  if (!r) return c.notFound()
  return c.html(AdminLayout({ title: 'Edit Coaching Result', user, activeNav: 'coaching-results', children: resultForm(r) }))
})

coachingResults.post('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = coachingResultSchema.safeParse(raw)

  if (!parsed.success) {
    const err = parsed.error.issues.map((i) => i.message).join('; ')
    return c.html(
      AdminLayout({ title: 'Edit Coaching Result', user, activeNav: 'coaching-results', children: resultForm({ id: Number(id), ...raw } as any, err) }),
      400
    )
  }

  const photoUrl = String(formData.get('photo_url') || '') || null

  await c.env.DB.prepare(
    `UPDATE coaching_results SET student_name = ?, photo_url = ?, exam_type = ?, listening = ?, reading = ?, writing = ?, speaking = ?, overall_band = ?, batch = ?, is_published = ? WHERE id = ?`
  )
    .bind(
      parsed.data.student_name,
      photoUrl,
      parsed.data.exam_type,
      parsed.data.listening ?? null,
      parsed.data.reading ?? null,
      parsed.data.writing ?? null,
      parsed.data.speaking ?? null,
      parsed.data.overall_band,
      parsed.data.batch || null,
      parsed.data.is_published,
      id
    )
    .run()

  await logActivity(c.env.DB, user, 'coaching_result.update', 'coaching_results', id, { student_name: parsed.data.student_name }, getClientIp(c.req.raw))

  return c.redirect('/admin/coaching-results?flash=Coaching result updated successfully.')
})

// ---------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------
coachingResults.post('/:id/toggle-publish', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT is_published FROM coaching_results WHERE id = ?').bind(id).first<{ is_published: number }>()
  if (!row) return c.notFound()
  const next = row.is_published ? 0 : 1
  await c.env.DB.prepare('UPDATE coaching_results SET is_published = ? WHERE id = ?').bind(next, id).run()
  await logActivity(c.env.DB, user, 'coaching_result.toggle_publish', 'coaching_results', id, { is_published: next }, getClientIp(c.req.raw))
  return c.redirect('/admin/coaching-results')
})

async function swapOrder(db: D1Database, id: string, direction: 'up' | 'down') {
  const current = await db.prepare('SELECT id, sort_order FROM coaching_results WHERE id = ?').bind(id).first<{ id: number; sort_order: number }>()
  if (!current) return
  const neighbor =
    direction === 'up'
      ? await db.prepare('SELECT id, sort_order FROM coaching_results WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1').bind(current.sort_order).first<{ id: number; sort_order: number }>()
      : await db.prepare('SELECT id, sort_order FROM coaching_results WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1').bind(current.sort_order).first<{ id: number; sort_order: number }>()
  if (!neighbor) return
  await db.batch([
    db.prepare('UPDATE coaching_results SET sort_order = ? WHERE id = ?').bind(neighbor.sort_order, current.id),
    db.prepare('UPDATE coaching_results SET sort_order = ? WHERE id = ?').bind(current.sort_order, neighbor.id)
  ])
}

coachingResults.post('/:id/move-up', async (c) => {
  await swapOrder(c.env.DB, c.req.param('id'), 'up')
  return c.redirect('/admin/coaching-results')
})

coachingResults.post('/:id/move-down', async (c) => {
  await swapOrder(c.env.DB, c.req.param('id'), 'down')
  return c.redirect('/admin/coaching-results')
})

coachingResults.post('/:id/delete', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM coaching_results WHERE id = ?').bind(id).run()
  await logActivity(c.env.DB, user, 'coaching_result.delete', 'coaching_results', id, null, getClientIp(c.req.raw))
  return c.redirect('/admin/coaching-results?flash=Coaching result deleted.')
})

export default coachingResults
