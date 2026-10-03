// =====================================================================
// Admin Students Portal Manager — enrolled students get a private
// portal link (/portal/:token) to track status and upload documents.
// This screen: list + search, create (optionally from an existing
// enquiry), edit/status update, document checklist, timeline updates,
// and admin document upload on the student's behalf.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Student, StudentDocument, StudentUpdate, Enquiry } from '../lib/types'
import { requireAdmin } from './middleware'
import { AdminLayout } from './layout'
import type { AdminSessionUser } from '../lib/auth'
import { logActivity } from '../lib/log'
import { getClientIp } from '../lib/ratelimit'
import { studentSchema, studentUpdateSchema } from '../lib/validation'
import { handleDocumentUpload } from '../lib/upload'

const students = new Hono<{ Bindings: Bindings }>()

students.use('*', requireAdmin)

const STATUSES = [
  'Registered',
  'Documents Pending',
  'Application Submitted',
  'Visa Filed',
  'Visa Approved',
  'Visa Rejected',
  'Enrolled',
  'On Hold'
]

function escapeHtml(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function escapeAttr(str: string | number | null | undefined): string {
  return escapeHtml(str).replace(/\n/g, '&#10;')
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'Visa Approved':
    case 'Enrolled':
      return 'status-Converted'
    case 'Visa Rejected':
      return 'status-Closed'
    case 'Documents Pending':
    case 'On Hold':
      return 'status-Contacted'
    case 'Application Submitted':
    case 'Visa Filed':
      return 'status-Follow-up'
    default:
      return 'status-New'
  }
}

function genToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------
// LIST + SEARCH
// ---------------------------------------------------------------------
students.get('/', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const flash = c.req.query('flash') || ''
  const q = (c.req.query('q') || '').trim()
  const status = c.req.query('status') || ''

  let where = 'WHERE 1=1'
  const binds: string[] = []
  if (q) {
    where += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)'
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`)
  }
  if (status && STATUSES.includes(status)) {
    where += ' AND status = ?'
    binds.push(status)
  }

  const { results } = await c.env.DB.prepare(`SELECT * FROM students ${where} ORDER BY created_at DESC`)
    .bind(...binds)
    .all<Student>()
  const list = results || []

  const content = `
    ${flash ? `<div class="admin-card bg-green-50 border-green-100 text-green-700 text-sm mb-5"><i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(flash)}</div>` : ''}

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <form method="get" class="flex flex-wrap gap-3 flex-1">
        <input type="search" name="q" value="${escapeAttr(q)}" placeholder="Search name, phone, email..." class="admin-input max-w-xs" />
        <select name="status" class="admin-input w-auto">
          <option value="">All Status</option>
          ${STATUSES.map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <button type="submit" class="admin-btn-secondary"><i class="fa-solid fa-filter"></i> Filter</button>
        ${q || status ? '<a href="/admin/students" class="admin-btn-secondary">Clear</a>' : ''}
      </form>
      <a href="/admin/students/new" class="admin-btn-primary shrink-0"><i class="fa-solid fa-plus"></i> Add Student</a>
    </div>

    <div class="admin-card !p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Registered</th>
              <th>Portal Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              list
                .map(
                  (s) => `
              <tr>
                <td>
                  <a href="/admin/students/${s.id}" class="font-semibold text-brand-blue hover:text-brand-red">${escapeHtml(s.name)}</a>
                  <p class="text-xs text-slate-400">${escapeHtml(s.phone)}${s.email ? ' · ' + escapeHtml(s.email) : ''}</p>
                </td>
                <td class="text-sm text-slate-600">${escapeHtml(s.country || '-')}${s.course ? `<p class="text-xs text-slate-400">${escapeHtml(s.course)}</p>` : ''}</td>
                <td><span class="status-badge ${statusBadgeClass(s.status)}">${escapeHtml(s.status)}</span></td>
                <td class="text-xs text-slate-400 whitespace-nowrap">${escapeHtml(s.created_at)}</td>
                <td>
                  <button type="button" data-copy-link="/portal/${s.access_token}" class="text-xs font-semibold text-brand-red hover:underline">
                    <i class="fa-solid fa-link mr-1"></i>Copy Link
                  </button>
                </td>
                <td>
                  <div class="flex gap-2">
                    <a href="/admin/students/${s.id}" class="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600" title="Manage"><i class="fa-solid fa-eye text-xs"></i></a>
                    <a href="/portal/${s.access_token}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600" title="View Student Portal"><i class="fa-solid fa-up-right-from-square text-xs"></i></a>
                  </div>
                </td>
              </tr>`
                )
                .join('') ||
              `<tr><td colspan="6" class="text-center text-slate-400 py-12"><i class="fa-solid fa-user-graduate text-3xl mb-2 block"></i>No students yet. Add one, or promote an enquiry to a student from the Enquiries screen.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>

    <script>
      document.querySelectorAll('[data-copy-link]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var path = btn.getAttribute('data-copy-link');
          var url = window.location.origin + path;
          navigator.clipboard.writeText(url).then(function () {
            var original = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i>Copied!';
            setTimeout(function () { btn.innerHTML = original; }, 1500);
          });
        });
      });
    </script>
  `

  return c.html(AdminLayout({ title: 'Students Portal Manager', user, activeNav: 'students', children: content }))
})

// ---------------------------------------------------------------------
// CREATE FORM
// ---------------------------------------------------------------------
function createForm(prefill: Partial<Student> | null, error?: string): string {
  return `
    <a href="/admin/students" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to Students</a>

    <div class="admin-card max-w-2xl">
      ${error ? `<div class="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4"><i class="fa-solid fa-triangle-exclamation mr-2"></i>${escapeHtml(error)}</div>` : ''}
      <form method="post" action="/admin/students/new" class="space-y-4">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Student Name *</label>
            <input type="text" name="name" required value="${escapeAttr(prefill?.name)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Mobile Number *</label>
            <input type="text" name="phone" required value="${escapeAttr(prefill?.phone)}" class="admin-input" />
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Email</label>
            <input type="email" name="email" value="${escapeAttr(prefill?.email)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">Target Country</label>
            <input type="text" name="country" placeholder="e.g. Canada" value="${escapeAttr(prefill?.country)}" class="admin-input" />
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="admin-label">Course</label>
            <input type="text" name="course" placeholder="e.g. MBA" value="${escapeAttr(prefill?.course)}" class="admin-input" />
          </div>
          <div>
            <label class="admin-label">University</label>
            <input type="text" name="university" value="${escapeAttr(prefill?.university)}" class="admin-input" />
          </div>
        </div>
        <div>
          <label class="admin-label">Status</label>
          <select name="status" class="admin-input">
            ${STATUSES.map((s) => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="admin-label">Required Documents (one per line)</label>
          <textarea name="required_documents" rows="5" placeholder="Passport&#10;IELTS Score Card&#10;Bank Statement (6 months)&#10;Offer Letter" class="admin-input">${escapeHtml(prefill?.required_documents)}</textarea>
        </div>
        <input type="hidden" name="enquiry_id" value="${escapeAttr(prefill?.enquiry_id)}" />
        <div class="flex gap-3 pt-2">
          <button type="submit" class="admin-btn-primary"><i class="fa-solid fa-floppy-disk"></i> Create Student &amp; Portal Link</button>
          <a href="/admin/students" class="admin-btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  `
}

students.get('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const enquiryId = c.req.query('enquiry_id') || ''
  let prefill: Partial<Student> | null = null

  if (enquiryId) {
    const enquiry = await c.env.DB.prepare('SELECT * FROM enquiries WHERE id = ?').bind(enquiryId).first<Enquiry>()
    if (enquiry) {
      prefill = {
        name: enquiry.name,
        phone: enquiry.phone,
        email: enquiry.email,
        country: enquiry.preferred_country,
        enquiry_id: enquiry.id
      }
    }
  }

  return c.html(AdminLayout({ title: 'Add Student', user, activeNav: 'students', children: createForm(prefill) }))
})

students.post('/new', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = studentSchema.safeParse(raw)

  if (!parsed.success) {
    const err = parsed.error.issues.map((i) => i.message).join('; ')
    return c.html(AdminLayout({ title: 'Add Student', user, activeNav: 'students', children: createForm(raw as any, err) }), 400)
  }

  const docsArray = (parsed.data.required_documents || '')
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)

  const token = genToken()

  const result = await c.env.DB.prepare(
    `INSERT INTO students (enquiry_id, access_token, name, phone, email, country, course, university, status, required_documents)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      parsed.data.enquiry_id ? Number(parsed.data.enquiry_id) : null,
      token,
      parsed.data.name,
      parsed.data.phone,
      parsed.data.email || null,
      parsed.data.country || null,
      parsed.data.course || null,
      parsed.data.university || null,
      parsed.data.status,
      JSON.stringify(docsArray)
    )
    .run()

  await logActivity(c.env.DB, user, 'student.create', 'students', result.meta.last_row_id, { name: parsed.data.name }, getClientIp(c.req.raw))

  return c.redirect(`/admin/students/${result.meta.last_row_id}?flash=Student added — portal link is ready to share.`)
})

// ---------------------------------------------------------------------
// DETAIL VIEW — status, documents, timeline
// ---------------------------------------------------------------------
students.get('/:id', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const flash = c.req.query('flash') || ''

  const student = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first<Student>()
  if (!student) return c.notFound()

  const [docsRes, updatesRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC').bind(id).all<StudentDocument>(),
    c.env.DB.prepare('SELECT * FROM student_updates WHERE student_id = ? ORDER BY created_at DESC').bind(id).all<StudentUpdate>()
  ])
  const docs = docsRes.results || []
  const updates = updatesRes.results || []

  let requiredDocs: string[] = []
  try {
    requiredDocs = JSON.parse(student.required_documents || '[]')
  } catch {
    requiredDocs = []
  }

  const portalUrl = `/portal/${student.access_token}`

  const content = `
    ${flash ? `<div class="admin-card bg-green-50 border-green-100 text-green-700 text-sm mb-5"><i class="fa-solid fa-circle-check mr-2"></i>${escapeHtml(flash)}</div>` : ''}

    <a href="/admin/students" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-red mb-5"><i class="fa-solid fa-arrow-left"></i> Back to Students</a>

    <div class="grid lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        <div class="admin-card">
          <div class="flex items-start justify-between mb-5">
            <div>
              <h2 class="font-display font-bold text-xl text-brand-blue">${escapeHtml(student.name)}</h2>
              <p class="text-slate-400 text-sm">${escapeHtml(student.phone)}${student.email ? ' · ' + escapeHtml(student.email) : ''}</p>
            </div>
            <span class="status-badge ${statusBadgeClass(student.status)}">${escapeHtml(student.status)}</span>
          </div>
          <dl class="grid sm:grid-cols-3 gap-4 text-sm mb-2">
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Country</dt><dd class="font-semibold text-slate-700">${escapeHtml(student.country || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">Course</dt><dd class="font-semibold text-slate-700">${escapeHtml(student.course || '-')}</dd></div>
            <div><dt class="text-slate-400 text-xs font-semibold uppercase">University</dt><dd class="font-semibold text-slate-700">${escapeHtml(student.university || '-')}</dd></div>
          </dl>
        </div>

        <div class="admin-card bg-blue-50 border-blue-100">
          <h3 class="font-display font-bold text-brand-blue mb-2"><i class="fa-solid fa-link mr-2"></i>Student Portal Link</h3>
          <p class="text-sm text-slate-600 mb-3">Share this private link with the student — no login needed. They can check status and upload documents.</p>
          <div class="flex items-center gap-2">
            <input type="text" readonly value="${portalUrl}" id="portal-link-input" class="admin-input flex-1 bg-white" />
            <button type="button" id="copy-portal-link" class="admin-btn-secondary !py-2.5"><i class="fa-solid fa-copy"></i> Copy</button>
            <a href="${portalUrl}" target="_blank" rel="noopener noreferrer" class="admin-btn-primary !py-2.5"><i class="fa-solid fa-up-right-from-square"></i></a>
          </div>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Documents</h3>
          ${
            requiredDocs.length
              ? `<div class="mb-4">
                  <p class="text-xs font-semibold text-slate-400 uppercase mb-2">Required Checklist</p>
                  <div class="flex flex-wrap gap-2">
                    ${requiredDocs
                      .map((d) => {
                        const uploaded = docs.some((doc) => doc.doc_name.toLowerCase() === d.toLowerCase())
                        return `<span class="text-xs font-semibold px-3 py-1.5 rounded-full ${uploaded ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}"><i class="fa-solid fa-${uploaded ? 'circle-check' : 'circle-exclamation'} mr-1"></i>${escapeHtml(d)}</span>`
                      })
                      .join('')}
                  </div>
                </div>`
              : ''
          }
          <div class="space-y-2 mb-5">
            ${
              docs
                .map(
                  (d) => `
              <div class="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div class="flex items-center gap-3">
                  <i class="fa-solid fa-file-lines text-brand-red"></i>
                  <div>
                    <p class="text-sm font-semibold text-slate-700">${escapeHtml(d.doc_name)}</p>
                    <p class="text-xs text-slate-400">Uploaded by ${d.uploaded_by === 'student' ? 'student' : escapeHtml(d.uploaded_by_name || 'admin')} · ${escapeHtml(d.created_at)}</p>
                  </div>
                </div>
                <a href="${escapeAttr(d.file_url)}" target="_blank" rel="noopener noreferrer" class="text-brand-red text-sm font-semibold hover:underline">View</a>
              </div>`
                )
                .join('') || '<p class="text-slate-400 text-sm">No documents uploaded yet.</p>'
            }
          </div>
          <form method="post" action="/admin/students/${student.id}/document" class="flex flex-wrap gap-2" enctype="multipart/form-data">
            <input type="text" name="doc_name" required placeholder="Document name (e.g. Passport)" class="admin-input flex-1 min-w-[160px]" />
            <input type="file" name="file" required accept="image/*,application/pdf" class="admin-input flex-1 min-w-[160px]" />
            <button type="submit" class="admin-btn-secondary shrink-0"><i class="fa-solid fa-upload"></i> Upload on Behalf</button>
          </form>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Application Timeline</h3>
          <div class="space-y-3 mb-5 max-h-80 overflow-y-auto">
            ${
              updates
                .map(
                  (u) => `
              <div class="bg-slate-50 rounded-lg p-3">
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-sm text-slate-700">${escapeHtml(u.title)}</p>
                  ${u.is_visible_to_student ? '<span class="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Visible to Student</span>' : '<span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Internal Only</span>'}
                </div>
                ${u.message ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(u.message)}</p>` : ''}
                <p class="text-xs text-slate-400 mt-1">${escapeHtml(u.created_by_name || '')} · ${escapeHtml(u.created_at)}</p>
              </div>`
                )
                .join('') || '<p class="text-slate-400 text-sm">No updates posted yet.</p>'
            }
          </div>
          <form method="post" action="/admin/students/${student.id}/update" class="space-y-2">
            <input type="text" name="title" required placeholder="Update title (e.g. 'Visa Filed')" class="admin-input" />
            <textarea name="message" rows="2" placeholder="Details for the student (optional)" class="admin-input"></textarea>
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" name="is_visible_to_student" checked class="w-4 h-4" /> Visible to student on their portal
            </label>
            <button type="submit" class="admin-btn-primary"><i class="fa-solid fa-plus"></i> Post Update</button>
          </form>
        </div>
      </div>

      <div class="space-y-6">
        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Update Status</h3>
          <form method="post" action="/admin/students/${student.id}/status" class="space-y-3">
            <select name="status" class="admin-input">
              ${STATUSES.map((s) => `<option value="${s}" ${student.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <button type="submit" class="admin-btn-primary w-full justify-center">Save Status</button>
          </form>
        </div>

        <div class="admin-card">
          <h3 class="font-display font-bold text-brand-blue mb-4">Edit Details</h3>
          <form method="post" action="/admin/students/${student.id}/edit" class="space-y-3">
            <div>
              <label class="admin-label">Name</label>
              <input type="text" name="name" required value="${escapeAttr(student.name)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">Phone</label>
              <input type="text" name="phone" required value="${escapeAttr(student.phone)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">Email</label>
              <input type="email" name="email" value="${escapeAttr(student.email)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">Country</label>
              <input type="text" name="country" value="${escapeAttr(student.country)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">Course</label>
              <input type="text" name="course" value="${escapeAttr(student.course)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">University</label>
              <input type="text" name="university" value="${escapeAttr(student.university)}" class="admin-input" />
            </div>
            <div>
              <label class="admin-label">Required Documents (one per line)</label>
              <textarea name="required_documents" rows="4" class="admin-input">${escapeHtml(requiredDocs.join('\n'))}</textarea>
            </div>
            <div>
              <label class="admin-label">Internal Notes</label>
              <textarea name="notes" rows="3" class="admin-input">${escapeHtml(student.notes)}</textarea>
            </div>
            <button type="submit" class="admin-btn-secondary w-full justify-center">Save Details</button>
          </form>
        </div>
      </div>
    </div>

    <script>
      var copyBtn = document.getElementById('copy-portal-link');
      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          var input = document.getElementById('portal-link-input');
          var url = window.location.origin + input.value;
          navigator.clipboard.writeText(url).then(function () {
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
            setTimeout(function () { copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy'; }, 1500);
          });
        });
      }
    </script>
  `

  return c.html(AdminLayout({ title: `Student: ${student.name}`, user, activeNav: 'students', children: content }))
})

// ---------------------------------------------------------------------
// MUTATIONS
// ---------------------------------------------------------------------
students.post('/:id/status', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const status = String(formData.get('status') || '')
  if (!STATUSES.includes(status)) return c.text('Invalid status', 400)

  await c.env.DB.prepare("UPDATE students SET status = ?, updated_at = datetime('now') WHERE id = ?").bind(status, id).run()
  await logActivity(c.env.DB, user, 'student.status_update', 'students', id, { status }, getClientIp(c.req.raw))
  return c.redirect(`/admin/students/${id}?flash=Status updated.`)
})

students.post('/:id/edit', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())

  const name = String(raw.name || '').trim()
  const phone = String(raw.phone || '').trim()
  if (!name || !phone) {
    return c.redirect(`/admin/students/${id}`)
  }

  const docsArray = String(raw.required_documents || '')
    .split('\n')
    .map((d) => d.trim())
    .filter(Boolean)

  await c.env.DB.prepare(
    `UPDATE students SET name = ?, phone = ?, email = ?, country = ?, course = ?, university = ?, required_documents = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(
      name,
      phone,
      String(raw.email || '') || null,
      String(raw.country || '') || null,
      String(raw.course || '') || null,
      String(raw.university || '') || null,
      JSON.stringify(docsArray),
      String(raw.notes || '') || null,
      id
    )
    .run()

  await logActivity(c.env.DB, user, 'student.update', 'students', id, { name }, getClientIp(c.req.raw))
  return c.redirect(`/admin/students/${id}?flash=Details updated.`)
})

students.post('/:id/document', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const docName = String(formData.get('doc_name') || '').trim()
  const file = formData.get('file')

  if (!docName || !file || typeof file === 'string') {
    return c.redirect(`/admin/students/${id}`)
  }

  const result = await handleDocumentUpload(c.env.UPLOADS, file as File, `students/${id}`)
  if (!result.ok) {
    return c.redirect(`/admin/students/${id}`)
  }

  await c.env.DB.prepare(
    `INSERT INTO student_documents (student_id, doc_name, file_url, uploaded_by, uploaded_by_name) VALUES (?, ?, ?, 'admin', ?)`
  )
    .bind(id, docName, result.url, user.name)
    .run()

  await logActivity(c.env.DB, user, 'student.document_upload', 'students', id, { doc_name: docName }, getClientIp(c.req.raw))
  return c.redirect(`/admin/students/${id}?flash=Document uploaded.`)
})

students.post('/:id/update', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const raw = Object.fromEntries(formData.entries())
  const parsed = studentUpdateSchema.safeParse(raw)

  if (!parsed.success) {
    return c.redirect(`/admin/students/${id}`)
  }

  await c.env.DB.prepare(
    `INSERT INTO student_updates (student_id, title, message, is_visible_to_student, created_by_name) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, parsed.data.title, parsed.data.message || null, parsed.data.is_visible_to_student, user.name)
    .run()

  await logActivity(c.env.DB, user, 'student.update_post', 'students', id, { title: parsed.data.title }, getClientIp(c.req.raw))
  return c.redirect(`/admin/students/${id}?flash=Update posted.`)
})

students.post('/:id/delete', async (c) => {
  const user = c.get('adminUser' as never) as AdminSessionUser
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run()
  await logActivity(c.env.DB, user, 'student.delete', 'students', id, null, getClientIp(c.req.raw))
  return c.redirect('/admin/students?flash=Student removed.')
})

export default students
