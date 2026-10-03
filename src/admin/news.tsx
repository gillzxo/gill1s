// =====================================================================
// Admin News / Immigration Updates Manager — list with status filter,
// create/edit with a dependency-free rich text editor, auto-slug, SEO
// fields, cover image upload, draft/publish/schedule workflow.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, NewsPost } from '../lib/types'
import { requireAdmin } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'
import { logActivity } from '../lib/log'
import { getClientIp } from '../lib/ratelimit'
import { newsPostSchema } from '../lib/validation'

const news = new Hono<{ Bindings: Bindings }>()

news.use('*', requireAdmin)

const CATEGORIES = ['Canada', 'UK', 'Australia', 'USA', 'General']
const STATUSES = ['draft', 'published', 'scheduled']

function escapeHtml(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str: string | number | null | undefined): string {
  return escapeHtml(str).replace(/\n/g, '&#10;')
}

// ---------------------------------------------------------------------
// LIST
// ---------------------------------------------------------------------
news.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const flash = c.req.query('flash') || ''
  const statusFilter = c.req.query('status') || ''

  let where = 'WHERE 1=1'
  const binds: string[] = []
  if (statusFilter && STATUSES.includes(statusFilter)) {
    where += ' AND status = ?'
    binds.push(statusFilter)
  }

  const { results } = await c.env.DB.prepare(`SELECT * FROM news_posts ${where} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<NewsPost>()
  const list = results || []

  const statusBadge: Record<string, string> = {
    draft: 'status-Closed',
    published: 'status-Converted',
    scheduled: 'status-Contacted'
  }

  const content = `
    ${flash ? `<div class="admin-card bg-green-50 border-green-100 text-green-700 text-sm mb-5"><i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(flash)}</div>` : ''}

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="flex gap-2">
        <a href="/admin/news" class="admin-btn-secondary !py-2 !px-4 ${!statusFilter ? '!bg-brand-blue !text-white' : ''}">All</a>
        ${STATUSES.map((s) => `<a href="/admin/news?status=${s}" class="admin-btn-secondary !py-2 !px-4 ${statusFilter === s ? '!bg-brand-blue !text-white' : ''}">${s[0].toUpperCase() + s.slice(1)}</a>`).join('')}
      </div>
      <a href="/admin/news/new" class="admin-btn-primary shrink-0"><i class="fa-solid fa-plus"></i> New Post</a>
    </div>

    <div class="admin-card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${
              list
                .map(
                  (n) => `
              <tr>
                <td>
                  <p class="font-semibold text-slate-700">${escapeHtml(n.title)}</p>
                  <p class="text-xs text-slate-400">/news/${escapeHtml(n.slug)}</p>
                </td>
                <td>${escapeHtml(n.category)}</td>
                <td><span class="status-badge ${statusBadge[n.status] || 'status-Closed'}">${n.status}</span></td>
                <td class="text-xs text-slate-400">${escapeHtml(n.published_at || '-')}</td>
                <td>
                  <div class="flex gap-2">
                    ${n.status === 'published' ? `<a href="/news/${escapeAttr(n.slug)}" target="_blank" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="View live"><i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></a>` : ''}
                    <a href="/admin/news/${n.id}/edit" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="Edit"><i class="fa-solid fa-pen text-xs"></i></a>
                    <form method="post" action="/admin/news/${n.id}/delete" class="inline"><button type="submit" data-confirm-delete="Delete this post permanently?" class="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-600" title="Delete"><i class="fa-solid fa-trash text-xs"></i></button></form>
                  </div>
                </td>
              </tr>`
                )
                .join('') || `<tr><td colspan="5" class="text-center text-slate-400 py-12"><i class="fa-solid fa-newspaper text-3xl mb-2 block"></i>No posts yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
  `

  return c.html(AdminLayout({ title: 'News / Immigration Updates', user, activeNav: 'news', children: content }))
})

// ---------------------------------------------------------------------
// FORM
// ---------------------------------------------------------------------
function postForm(n: Partial<NewsPost> | null, error?: string): string {
  const isEdit = !!n?.id
  // Local datetime-local value needs "YYYY-MM-DDTHH:mm" format
  const publishedLocal = n?.published_at ? n.published_at.replace(' ', 'T').slice(0, 16) : ''

  return `
    <a href="/admin/news" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to News</a>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="admin-card">
          ${error ? `<div class="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${escapeHtml(error)}</div>` : ''}
          <form method="post" action="${isEdit ? `/admin/news/${n!.id}/edit` : '/admin/news/new'}" id="news-form" class="space-y-4">
            <div>
              <label class="admin-label">Title *</label>
              <input type="text" name="title" id="news-title" required value="${escapeAttr(n?.title)}" class="admin-input" />
            </div>

            <div>
              <label class="admin-label">SEO URL Slug *</label>
              <input type="text" name="slug" id="news-slug" data-slug-source="news-title" required value="${escapeAttr(n?.slug)}" class="admin-input" />
              <p class="text-xs text-slate-400 mt-1">Lowercase letters, numbers and hyphens only. Auto-generated from title — edit if needed.</p>
            </div>

            <div>
              <label class="admin-label">Excerpt (short summary shown in listings)</label>
              <textarea name="excerpt" rows="2" maxlength="500" class="admin-input">${escapeHtml(n?.excerpt)}</textarea>
            </div>

            <div>
              <label class="admin-label">Content *</label>
              <div class="rte-toolbar" data-rte-toolbar="news-content-editable">
                <button type="button" data-cmd="bold" title="Bold"><i class="fa-solid fa-bold"></i></button>
                <button type="button" data-cmd="italic" title="Italic"><i class="fa-solid fa-italic"></i></button>
                <button type="button" data-cmd="formatBlock" data-value="H2" title="Heading 2"><i class="fa-solid fa-heading"></i></button>
                <button type="button" data-cmd="formatBlock" data-value="H3" title="Heading 3"><i class="fa-solid fa-heading fa-xs"></i></button>
                <button type="button" data-cmd="insertUnorderedList" title="Bullet list"><i class="fa-solid fa-list-ul"></i></button>
                <button type="button" data-cmd="insertOrderedList" title="Numbered list"><i class="fa-solid fa-list-ol"></i></button>
                <button type="button" data-cmd="createLink" title="Insert link"><i class="fa-solid fa-link"></i></button>
                <button type="button" data-cmd="insertImage" title="Insert image"><i class="fa-solid fa-image"></i></button>
                <button type="button" data-cmd="removeFormat" title="Clear formatting"><i class="fa-solid fa-eraser"></i></button>
              </div>
              <div id="news-content-editable" class="rte-content" contenteditable="true">${n?.content_html || '<p></p>'}</div>
              <textarea name="content_html" data-rte-output="news-content-editable" class="hidden"></textarea>
            </div>
          </form>
        </div>
      </div>

      <div class="space-y-6">
        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Publish Settings</h3>
          <div class="space-y-3">
            <div>
              <label class="admin-label">Category *</label>
              <select name="category" form="news-form" class="admin-input">
                ${CATEGORIES.map((cat) => `<option value="${cat}" ${n?.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="admin-label">Status *</label>
              <select name="status" form="news-form" id="news-status" class="admin-input">
                ${STATUSES.map((s) => `<option value="${s}" ${n?.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="admin-label">Publish Date/Time <span class="text-slate-400 font-normal">(required if Scheduled)</span></label>
              <input type="datetime-local" name="published_at" form="news-form" value="${escapeAttr(publishedLocal)}" class="admin-input" />
            </div>
          </div>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Cover Image</h3>
          <div class="dropzone" data-dropzone data-folder="news">
            <input type="file" accept="image/*" class="hidden" data-dropzone-input />
            <img data-dropzone-preview class="${n?.cover_image_url ? '' : 'hidden'} mx-auto mb-3 max-h-32 rounded-lg object-cover" ${n?.cover_image_url ? `src="${escapeAttr(n.cover_image_url)}"` : ''} />
            <p data-dropzone-prompt class="text-sm text-slate-400"><i class="fa-solid fa-cloud-arrow-up text-2xl block mb-2 text-slate-300"></i>${n?.cover_image_url ? 'Image uploaded! Click to replace.' : 'Click or drag an image here'}</p>
          </div>
          <input type="hidden" name="cover_image_url" form="news-form" data-dropzone-target value="${escapeAttr(n?.cover_image_url)}" />
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">SEO (optional)</h3>
          <div class="space-y-3">
            <div>
              <label class="admin-label">SEO Title</label>
              <input type="text" name="seo_title" form="news-form" maxlength="200" value="${escapeAttr(n?.seo_title)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">SEO Description</label>
              <textarea name="seo_description" form="news-form" rows="2" maxlength="300" class="admin-input">${escapeHtml(n?.seo_description)}</textarea>
            </div>
          </div>
        </div>

        <button type="submit" form="news-form" class="admin-btn-primary w-full justify-center"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? 'Save Changes' : 'Create Post'}</button>
      </div>
    </div>
  `
}

news.get('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  return c.html(AdminLayout({ title: 'New Post', user, activeNav: 'news', children: postForm(null) }))
})

function toSqlDateTime(localValue: string): string | null {
  if (!localValue) return null
  // datetime-local gives "YYYY-MM-DDTHH:mm" — normalise to "YYYY-MM-DD HH:mm:00"
  return localValue.replace('T', ' ') + ':00'
}

news.post('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = newsPostSchema.safeParse(raw)

  if (!parsed.success) {
    const err = parsed.error.issues.map((i) => i.message).join('; ')
    return c.html(AdminLayout({ title: 'New Post', user, activeNav: 'news', children: postForm(raw as any, err) }), 400)
  }

  if (parsed.data.status === 'scheduled' && !parsed.data.published_at) {
    return c.html(
      AdminLayout({ title: 'New Post', user, activeNav: 'news', children: postForm(raw as any, 'Please set a publish date/time for a scheduled post.') }),
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT id FROM news_posts WHERE slug = ?').bind(parsed.data.slug).first()
  if (existing) {
    return c.html(AdminLayout({ title: 'New Post', user, activeNav: 'news', children: postForm(raw as any, 'That slug is already in use. Please choose a different one.') }), 400)
  }

  const publishedAt = parsed.data.status === 'published' ? toSqlDateTime(new Date().toISOString().slice(0, 16)) : toSqlDateTime(parsed.data.published_at || '')
  const coverImageUrl = String(formData.get('cover_image_url') || '') || null

  const result = await c.env.DB.prepare(
    `INSERT INTO news_posts (title, slug, category, cover_image_url, excerpt, content_html, status, published_at, author_id, seo_title, seo_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      parsed.data.title,
      parsed.data.slug,
      parsed.data.category,
      coverImageUrl,
      parsed.data.excerpt || null,
      parsed.data.content_html,
      parsed.data.status,
      publishedAt,
      user.id,
      parsed.data.seo_title || null,
      parsed.data.seo_description || null
    )
    .run()

  await logActivity(c.env.DB, user, 'news.create', 'news_posts', result.meta.last_row_id, { title: parsed.data.title, status: parsed.data.status }, getClientIp(c.req.raw))

  return c.redirect('/admin/news?flash=Post saved successfully.')
})

news.get('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const n = await c.env.DB.prepare('SELECT * FROM news_posts WHERE id = ?').bind(id).first<NewsPost>()
  if (!n) return c.notFound()
  return c.html(AdminLayout({ title: 'Edit Post', user, activeNav: 'news', children: postForm(n) }))
})

news.post('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = newsPostSchema.safeParse(raw)

  if (!parsed.success) {
    const err = parsed.error.issues.map((i) => i.message).join('; ')
    return c.html(AdminLayout({ title: 'Edit Post', user, activeNav: 'news', children: postForm({ id: Number(id), ...raw } as any, err) }), 400)
  }

  if (parsed.data.status === 'scheduled' && !parsed.data.published_at) {
    return c.html(
      AdminLayout({ title: 'Edit Post', user, activeNav: 'news', children: postForm({ id: Number(id), ...raw } as any, 'Please set a publish date/time for a scheduled post.') }),
      400
    )
  }

  const existing = await c.env.DB.prepare('SELECT id FROM news_posts WHERE slug = ? AND id != ?').bind(parsed.data.slug, id).first()
  if (existing) {
    return c.html(
      AdminLayout({ title: 'Edit Post', user, activeNav: 'news', children: postForm({ id: Number(id), ...raw } as any, 'That slug is already in use by another post.') }),
      400
    )
  }

  const current = await c.env.DB.prepare('SELECT status, published_at FROM news_posts WHERE id = ?').bind(id).first<{ status: string; published_at: string | null }>()
  let publishedAt: string | null
  if (parsed.data.status === 'published') {
    publishedAt = current?.published_at || toSqlDateTime(new Date().toISOString().slice(0, 16))
  } else {
    publishedAt = toSqlDateTime(parsed.data.published_at || '')
  }

  const coverImageUrl = String(formData.get('cover_image_url') || '') || null

  await c.env.DB.prepare(
    `UPDATE news_posts SET title = ?, slug = ?, category = ?, cover_image_url = ?, excerpt = ?, content_html = ?, status = ?, published_at = ?, seo_title = ?, seo_description = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(
      parsed.data.title,
      parsed.data.slug,
      parsed.data.category,
      coverImageUrl,
      parsed.data.excerpt || null,
      parsed.data.content_html,
      parsed.data.status,
      publishedAt,
      parsed.data.seo_title || null,
      parsed.data.seo_description || null,
      id
    )
    .run()

  await logActivity(c.env.DB, user, 'news.update', 'news_posts', id, { title: parsed.data.title, status: parsed.data.status }, getClientIp(c.req.raw))

  return c.redirect('/admin/news?flash=Post updated successfully.')
})

news.post('/:id/delete', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM news_posts WHERE id = ?').bind(id).run()
  await logActivity(c.env.DB, user, 'news.delete', 'news_posts', id, null, getClientIp(c.req.raw))
  return c.redirect('/admin/news?flash=Post deleted.')
})

export default news
