// =====================================================================
// Admin Visa Results Manager — gallery grid with drag-drop image
// upload, publish/unpublish toggle, reorder (up/down), edit, delete.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, VisaResult } from '../lib/types'
import { requireAdmin } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'
import { logActivity } from '../lib/log'
import { getClientIp } from '../lib/ratelimit'
import { visaResultSchema } from '../lib/validation'

const visaResults = new Hono<{ Bindings: Bindings }>()

visaResults.use('*', requireAdmin)

function escapeHtml(str: string | null | undefined): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str: string | null | undefined): string {
  return escapeHtml(str).replace(/\n/g, '&#10;')
}

// ---------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------
visaResults.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const flash = c.req.query('flash') || ''

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM visa_results ORDER BY sort_order ASC, created_at DESC'
  ).all<VisaResult>()
  const list = results || []

  const content = `
    ${flash ? `<div class="admin-card bg-green-50 border-green-100 text-green-700 text-sm mb-5"><i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(flash)}</div>` : ''}

    <div class="flex items-center justify-between mb-6">
      <p class="text-slate-500 text-sm">${list.length} result${list.length === 1 ? '' : 's'} total. Drag the arrows to reorder; order shown here matches the public gallery.</p>
      <a href="/admin/visa-results/new" class="admin-btn-primary"><i class="fa-solid fa-plus"></i> Add Visa Result</a>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      ${
        list
          .map(
            (v, idx) => `
        <div class="admin-card !p-0 overflow-hidden flex flex-col">
          <div class="relative aspect-[4/3] bg-slate-100">
            <img src="${escapeAttr(v.image_url)}" alt="${escapeAttr(v.student_name)}" class="w-full h-full object-cover" />
            <span class="absolute top-2 left-2 status-badge ${v.is_published ? 'status-Converted' : 'status-Closed'}">${v.is_published ? 'Published' : 'Hidden'}</span>
          </div>
          <div class="p-4 flex-1 flex flex-col">
            <h3 class="font-display font-bold text-brand-blue text-sm">${escapeHtml(v.student_name)}</h3>
            <p class="text-xs text-slate-400 mb-3">${escapeHtml(v.country)} &middot; ${escapeHtml(v.visa_type)}${v.visa_date ? ' &middot; ' + escapeHtml(v.visa_date) : ''}</p>
            <div class="mt-auto flex items-center gap-2 flex-wrap">
              <a href="/admin/visa-results/${v.id}/edit" class="admin-btn-secondary !py-1.5 !px-3 text-xs"><i class="fa-solid fa-pen"></i> Edit</a>
              <form method="post" action="/admin/visa-results/${v.id}/toggle-publish" class="inline">
                <button type="submit" class="admin-btn-secondary !py-1.5 !px-3 text-xs">
                  <i class="fa-solid fa-${v.is_published ? 'eye-slash' : 'eye'}"></i> ${v.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </form>
              ${idx > 0 ? `<form method="post" action="/admin/visa-results/${v.id}/move-up" class="inline"><button type="submit" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs" title="Move up"><i class="fa-solid fa-arrow-up"></i></button></form>` : ''}
              ${idx < list.length - 1 ? `<form method="post" action="/admin/visa-results/${v.id}/move-down" class="inline"><button type="submit" class="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs" title="Move down"><i class="fa-solid fa-arrow-down"></i></button></form>` : ''}
              <form method="post" action="/admin/visa-results/${v.id}/delete" class="inline ml-auto">
                <button type="submit" data-confirm-delete="Delete this visa result permanently?" class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs" title="Delete"><i class="fa-solid fa-trash"></i></button>
              </form>
            </div>
          </div>
        </div>`
          )
          .join('') ||
        `<div class="col-span-full admin-card text-center py-16 text-slate-400"><i class="fa-solid fa-passport text-3xl mb-3 block"></i>No visa results yet. Click "Add Visa Result" to publish your first success story.</div>`
      }
    </div>
  `

  return c.html(AdminLayout({ title: 'Visa Results Manager', user, activeNav: 'visa-results', children: content }))
})

// ---------------------------------------------------------------------
// FORM (shared by create + edit)
// ---------------------------------------------------------------------
function resultForm(v: Partial<VisaResult> | null, error?: string): string {
  const isEdit = !!v?.id
  return `
    <a href="/admin/visa-results" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to Visa Results</a>

    <div class="admin-card max-w-2xl">
      ${error ? `<div class="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${escapeHtml(error)}</div>` : ''}
      <form method="post" action="${isEdit ? `/admin/visa-results/${v!.id}/edit` : '/admin/visa-results/new'}" class="space-y-4">
        <div>
          <label class="admin-label">Photo</label>
          <div class="dropzone" data-dropzone data-folder="visa-results">
            <input type="file" accept="image/*" class="hidden" data-dropzone-input />
            <img data-dropzone-preview class="${v?.image_url ? '' : 'hidden'} mx-auto mb-3 max-h-40 rounded-lg object-cover" ${v?.image_url ? `src="${escapeAttr(v.image_url)}"` : ''} />
            <p data-dropzone-prompt class="text-sm text-slate-400"><i class="fa-solid fa-cloud-arrow-up text-2xl block mb-2 text-slate-300"></i>${v?.image_url ? 'Image uploaded! Click to replace.' : 'Click or drag an image here to upload'}</p>
          </div>
          <input type="hidden" name="image_url" data-dropzone-target value="${escapeAttr(v?.image_url)}" required />
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Student Name *</label>
            <input type="text" name="student_name" required value="${escapeAttr(v?.student_name)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Country *</label>
            <select name="country" required class="admin-input">
              ${['Canada', 'UK', 'Australia', 'USA', 'Germany', 'Other']
                .map((cty) => `<option value="${cty}" ${v?.country === cty ? 'selected' : ''}>${cty}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="admin-label">Visa Type *</label>
            <select name="visa_type" required class="admin-input">
              ${['Study Visa', 'Visitor Visa', 'PR', 'Work Permit', 'Spouse Visa', 'Other']
                .map((t) => `<option value="${t}" ${v?.visa_type === t ? 'selected' : ''}>${t}</option>`)
                .join('')}
            </select>
          </div>
          <div>
            <label class="admin-label">Visa Date</label>
            <input type="text" name="visa_date" placeholder="e.g. Sept 2025" value="${escapeAttr(v?.visa_date)}" class="admin-input" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <input type="checkbox" name="is_published" ${v?.is_published || !isEdit ? 'checked' : ''} class="w-4 h-4" />
          Publish immediately (visible on the public Visa Results gallery)
        </label>

        <div class="flex gap-3 pt-2">
          <button type="submit" class="admin-btn-primary"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Save Changes' : 'Add Visa Result'}</button>
          <a href="/admin/visa-results" class="admin-btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `
}

visaResults.get('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  return c.html(AdminLayout({ title: 'Add Visa Result', user, activeNav: 'visa-results', children: resultForm(null) }))
})

visaResults.post('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const formData = await c.req.formData()
  const parsed = visaResultSchema.safeParse(Object.fromEntries(formData.entries()))
  const imageUrl = String(formData.get('image_url') || '')

  if (!parsed.success || !imageUrl) {
    const err = !imageUrl ? 'Please upload a photo.' : parsed.error!.issues.map((i) => i.message).join('; ')
    return c.html(
      AdminLayout({
        title: 'Add Visa Result',
        user,
        activeNav: 'visa-results',
        children: resultForm({ ...Object.fromEntries(formData.entries()) } as any, err)
      }),
      400
    )
  }

  const maxOrderRow = await c.env.DB.prepare('SELECT MAX(sort_order) as m FROM visa_results').first<{ m: number | null }>()
  const nextOrder = (maxOrderRow?.m ?? -1) + 1

  const result = await c.env.DB.prepare(
    `INSERT INTO visa_results (student_name, country, visa_type, image_url, visa_date, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(parsed.data.student_name, parsed.data.country, parsed.data.visa_type, imageUrl, parsed.data.visa_date || null, parsed.data.is_published, nextOrder)
    .run()

  await logActivity(c.env.DB, user, 'visa_result.create', 'visa_results', result.meta.last_row_id, { student_name: parsed.data.student_name }, getClientIp(c.req.raw))

  return c.redirect('/admin/visa-results?flash=Visa result added successfully.')
})

visaResults.get('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const v = await c.env.DB.prepare('SELECT * FROM visa_results WHERE id = ?').bind(id).first<VisaResult>()
  if (!v) return c.notFound()
  return c.html(AdminLayout({ title: 'Edit Visa Result', user, activeNav: 'visa-results', children: resultForm(v) }))
})

visaResults.post('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const parsed = visaResultSchema.safeParse(Object.fromEntries(formData.entries()))
  const imageUrl = String(formData.get('image_url') || '')

  if (!parsed.success || !imageUrl) {
    const err = !imageUrl ? 'Please upload a photo.' : parsed.error!.issues.map((i) => i.message).join('; ')
    return c.html(
      AdminLayout({
        title: 'Edit Visa Result',
        user,
        activeNav: 'visa-results',
        children: resultForm({ id: Number(id), ...Object.fromEntries(formData.entries()) } as any, err)
      }),
      400
    )
  }

  await c.env.DB.prepare(
    `UPDATE visa_results SET student_name = ?, country = ?, visa_type = ?, image_url = ?, visa_date = ?, is_published = ? WHERE id = ?`
  )
    .bind(parsed.data.student_name, parsed.data.country, parsed.data.visa_type, imageUrl, parsed.data.visa_date || null, parsed.data.is_published, id)
    .run()

  await logActivity(c.env.DB, user, 'visa_result.update', 'visa_results', id, { student_name: parsed.data.student_name }, getClientIp(c.req.raw))

  return c.redirect('/admin/visa-results?flash=Visa result updated successfully.')
})

// ---------------------------------------------------------------------
// MUTATIONS: publish toggle, reorder, delete
// ---------------------------------------------------------------------
visaResults.post('/:id/toggle-publish', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const row = await c.env.DB.prepare('SELECT is_published FROM visa_results WHERE id = ?').bind(id).first<{ is_published: number }>()
  if (!row) return c.notFound()
  const next = row.is_published ? 0 : 1
  await c.env.DB.prepare('UPDATE visa_results SET is_published = ? WHERE id = ?').bind(next, id).run()
  await logActivity(c.env.DB, user, 'visa_result.toggle_publish', 'visa_results', id, { is_published: next }, getClientIp(c.req.raw))
  return c.redirect('/admin/visa-results')
})

async function swapOrder(db: D1Database, id: string, direction: 'up' | 'down') {
  const current = await db.prepare('SELECT id, sort_order FROM visa_results WHERE id = ?').bind(id).first<{ id: number; sort_order: number }>()
  if (!current) return
  const neighbor =
    direction === 'up'
      ? await db.prepare('SELECT id, sort_order FROM visa_results WHERE sort_order < ? ORDER BY sort_order DESC LIMIT 1').bind(current.sort_order).first<{ id: number; sort_order: number }>()
      : await db.prepare('SELECT id, sort_order FROM visa_results WHERE sort_order > ? ORDER BY sort_order ASC LIMIT 1').bind(current.sort_order).first<{ id: number; sort_order: number }>()
  if (!neighbor) return
  await db.batch([
    db.prepare('UPDATE visa_results SET sort_order = ? WHERE id = ?').bind(neighbor.sort_order, current.id),
    db.prepare('UPDATE visa_results SET sort_order = ? WHERE id = ?').bind(current.sort_order, neighbor.id)
  ])
}

visaResults.post('/:id/move-up', async (c) => {
  await swapOrder(c.env.DB, c.req.param('id'), 'up')
  return c.redirect('/admin/visa-results')
})

visaResults.post('/:id/move-down', async (c) => {
  await swapOrder(c.env.DB, c.req.param('id'), 'down')
  return c.redirect('/admin/visa-results')
})

visaResults.post('/:id/delete', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM visa_results WHERE id = ?').bind(id).run()
  await logActivity(c.env.DB, user, 'visa_result.delete', 'visa_results', id, null, getClientIp(c.req.raw))
  return c.redirect('/admin/visa-results?flash=Visa result deleted.')
})

export default visaResults
