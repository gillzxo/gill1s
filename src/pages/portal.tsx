// =====================================================================
// Public Student Portal — a private, login-free page at /portal/:token
// where an enrolled student can see their application status, timeline
// updates from our team, the list of required documents, and upload
// their own documents (passport, photos, bank statements, etc).
//
// Security model: no username/password — the 32-char random token in
// the URL IS the credential (same pattern as many "magic link" student
// trackers). Tokens are generated server-side (crypto.getRandomValues,
// 16 bytes = 32 hex chars) and only ever shown to admin staff, who share
// the link with the student via WhatsApp/email. Never list/search by
// token; always look up by exact match.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, Student, StudentDocument, StudentUpdate } from '../lib/types'
import { handleDocumentUpload } from '../lib/upload'

const portalPage = new Hono<{ Bindings: Bindings }>()

function escapeHtml(str: string | number | null | undefined): string {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function statusMeta(status: string): { color: string; icon: string; step: number } {
  const order = [
    'Registered',
    'Documents Pending',
    'Application Submitted',
    'Visa Filed',
    'Visa Approved',
    'Enrolled'
  ]
  const step = order.indexOf(status)
  if (status === 'Visa Rejected') return { color: 'text-red-600 bg-red-50 border-red-200', icon: 'fa-circle-xmark', step: -1 }
  if (status === 'On Hold') return { color: 'text-amber-600 bg-amber-50 border-amber-200', icon: 'fa-pause-circle', step: -1 }
  if (status === 'Visa Approved' || status === 'Enrolled') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: 'fa-circle-check', step: step >= 0 ? step : 5 }
  return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: 'fa-circle-notch', step: step >= 0 ? step : 0 }
}

const STEPS = ['Registered', 'Documents Pending', 'Application Submitted', 'Visa Filed', 'Visa Approved / Enrolled']

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function docIcon(url: string): string {
  return /\.pdf$/i.test(url) ? 'fa-file-pdf text-red-500' : 'fa-file-image text-blue-500'
}

portalPage.get('/portal/:token', async (c) => {
  const token = c.req.param('token')
  const flash = c.req.query('flash') || ''
  const error = c.req.query('error') || ''

  const student = await c.env.DB.prepare('SELECT * FROM students WHERE access_token = ?').bind(token).first<Student>()

  if (!student) {
    return c.render(
      <section class="min-h-[70vh] flex items-center justify-center hero-gradient py-20">
        <div class="max-w-md mx-auto px-6 text-center text-white">
          <i class="fa-solid fa-link-slash text-5xl text-amber-400 mb-6"></i>
          <h1 class="font-display text-2xl sm:text-3xl font-extrabold mb-3">Portal Link Not Found</h1>
          <p class="text-slate-300 mb-8">
            This link may be incorrect or expired. Please contact our office to get your correct student portal link.
          </p>
          <a href="/contact" class="inline-flex items-center gap-2 bg-brand-red text-white font-bold px-6 py-3 rounded-full hover:bg-red-700 transition">
            <i class="fa-solid fa-phone"></i> Contact Us
          </a>
        </div>
      </section>,
      { title: 'Student Portal', noindex: true }
    )
  }

  const [{ results: documents }, { results: updates }] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM student_documents WHERE student_id = ? ORDER BY created_at DESC').bind(student.id).all<StudentDocument>(),
    c.env.DB.prepare('SELECT * FROM student_updates WHERE student_id = ? AND is_visible_to_student = 1 ORDER BY created_at DESC').bind(student.id).all<StudentUpdate>()
  ])

  const meta = statusMeta(student.status)
  const requiredDocsList = (student.required_documents || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)

  return c.render(
    <>
      <section class="hero-gradient pt-10 pb-20 sm:pt-14 sm:pb-28">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <span class="inline-flex items-center gap-2 bg-white/10 text-xs font-bold tracking-wide uppercase px-4 py-2 rounded-full mb-5 text-amber-300">
            <i class="fa-solid fa-user-graduate"></i> Student Portal
          </span>
          <h1 class="font-display text-2xl sm:text-4xl font-extrabold text-white leading-tight mb-2">
            Welcome, {student.name.split(' ')[0]} 👋
          </h1>
          <p class="text-slate-300 text-sm sm:text-base">
            Track your application progress and manage your documents below. Bookmark this page — it is your private
            link, so please don't share it.
          </p>
        </div>
      </section>

      <section class="-mt-12 sm:-mt-16 pb-20">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {flash ? (
            <div class="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-5 py-4 text-sm font-semibold flex items-center gap-2 reveal">
              <i class="fa-solid fa-circle-check"></i> {escapeHtml(flash)}
            </div>
          ) : null}
          {error ? (
            <div class="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-5 py-4 text-sm font-semibold flex items-center gap-2 reveal">
              <i class="fa-solid fa-triangle-exclamation"></i> {escapeHtml(error)}
            </div>
          ) : null}

          {/* Status card */}
          <div class="bg-white rounded-3xl shadow-xl p-6 sm:p-8 reveal">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p class="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Current Status</p>
                <span class={`inline-flex items-center gap-2 border rounded-full px-4 py-2 font-bold text-sm ${meta.color}`}>
                  <i class={`fa-solid ${meta.icon}`}></i> {student.status}
                </span>
              </div>
              <div class="text-right text-sm text-slate-500">
                {student.country ? (
                  <p>
                    <i class="fa-solid fa-earth-asia mr-1 text-brand-red"></i> {escapeHtml(student.country)}
                  </p>
                ) : null}
                {student.course ? <p class="mt-1">{escapeHtml(student.course)}</p> : null}
              </div>
            </div>

            {/* Progress tracker */}
            {meta.step >= 0 ? (
              <div class="hidden sm:flex items-center">
                {STEPS.map((label, i) => (
                  <>
                    <div class="flex flex-col items-center flex-1">
                      <div
                        class={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                          i <= meta.step ? 'bg-brand-red border-brand-red text-white' : 'border-slate-200 text-slate-300 bg-white'
                        }`}
                      >
                        {i < meta.step ? <i class="fa-solid fa-check"></i> : i + 1}
                      </div>
                      <p class={`mt-2 text-[11px] text-center font-semibold ${i <= meta.step ? 'text-brand-blue' : 'text-slate-300'}`}>{label}</p>
                    </div>
                    {i < STEPS.length - 1 ? (
                      <div class={`h-0.5 flex-1 -mt-5 ${i < meta.step ? 'bg-brand-red' : 'bg-slate-200'}`}></div>
                    ) : null}
                  </>
                ))}
              </div>
            ) : (
              <p class="text-sm text-slate-500">
                {student.status === 'Visa Rejected'
                  ? 'Your visa application was not approved this time. Our counsellor will contact you shortly to discuss next steps.'
                  : 'Your application is currently on hold. Our counsellor will reach out with more details.'}
              </p>
            )}
          </div>

          <div class="grid md:grid-cols-5 gap-6">
            {/* Timeline */}
            <div class="md:col-span-3 bg-white rounded-3xl shadow-xl p-6 sm:p-8 reveal">
              <h2 class="font-display text-lg font-bold text-brand-blue mb-5 flex items-center gap-2">
                <i class="fa-solid fa-timeline text-brand-red"></i> Application Timeline
              </h2>
              {updates.length === 0 ? (
                <p class="text-sm text-slate-400 italic">No updates posted yet. Check back soon!</p>
              ) : (
                <ol class="relative border-l-2 border-slate-100 space-y-6 pl-5">
                  {updates.map((u) => (
                    <li class="relative">
                      <span class="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-brand-red border-2 border-white shadow"></span>
                      <p class="text-xs text-slate-400 font-semibold mb-0.5">{fmtDateTime(u.created_at)}</p>
                      <p class="font-bold text-slate-800 text-sm">{escapeHtml(u.title)}</p>
                      {u.message ? <p class="text-sm text-slate-500 mt-1 whitespace-pre-line">{escapeHtml(u.message)}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Required documents + uploaded documents + upload form */}
            <div class="md:col-span-2 space-y-6">
              {requiredDocsList.length > 0 ? (
                <div class="bg-white rounded-3xl shadow-xl p-6 reveal">
                  <h2 class="font-display text-base font-bold text-brand-blue mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-list-check text-brand-red"></i> Documents Needed
                  </h2>
                  <ul class="space-y-2">
                    {requiredDocsList.map((d) => (
                      <li class="flex items-start gap-2 text-sm text-slate-600">
                        <i class="fa-regular fa-square text-slate-300 mt-0.5"></i> {escapeHtml(d)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div class="bg-white rounded-3xl shadow-xl p-6 reveal">
                <h2 class="font-display text-base font-bold text-brand-blue mb-4 flex items-center gap-2">
                  <i class="fa-solid fa-cloud-arrow-up text-brand-red"></i> Upload a Document
                </h2>
                <form method="post" action={`/portal/${token}/upload`} encType="multipart/form-data" class="space-y-3">
                  <input
                    type="text"
                    name="doc_name"
                    required
                    placeholder="e.g. Passport front page"
                    class="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red outline-none"
                  />
                  <label class="portal-dropzone flex flex-col items-center justify-center text-center cursor-pointer" id="portal-dropzone-label">
                    <i class="fa-solid fa-file-arrow-up text-2xl text-slate-300 mb-2"></i>
                    <span class="text-xs text-slate-400" id="portal-file-name">JPG, PNG or PDF — max 10MB</span>
                    <input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" required class="hidden" id="portal-file-input" />
                  </label>
                  <button
                    type="submit"
                    class="w-full bg-brand-red text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition text-sm"
                  >
                    <i class="fa-solid fa-upload mr-1"></i> Upload
                  </button>
                </form>
              </div>

              {documents.length > 0 ? (
                <div class="bg-white rounded-3xl shadow-xl p-6 reveal">
                  <h2 class="font-display text-base font-bold text-brand-blue mb-4 flex items-center gap-2">
                    <i class="fa-solid fa-folder-open text-brand-red"></i> Uploaded Documents
                  </h2>
                  <ul class="space-y-2">
                    {documents.map((d) => (
                      <li class="flex items-center gap-3 text-sm">
                        <i class={`fa-solid ${docIcon(d.file_url)}`}></i>
                        <a href={d.file_url} target="_blank" rel="noopener" class="text-brand-blue font-semibold hover:underline truncate flex-1">
                          {escapeHtml(d.doc_name)}
                        </a>
                        <span class="text-[11px] text-slate-400 shrink-0">
                          {d.uploaded_by === 'admin' ? 'By office' : 'You'} · {fmtDate(d.created_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div class="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-5 text-sm text-slate-500 flex items-start gap-3 reveal">
            <i class="fa-solid fa-circle-info text-brand-blue mt-0.5"></i>
            <p>
              Questions about your application? Call us or message on WhatsApp — our counsellors are happy to help.{' '}
              <a href="/contact" class="text-brand-red font-semibold hover:underline">
                Contact details here
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              var input = document.getElementById('portal-file-input');
              var label = document.getElementById('portal-file-name');
              if (input && label) {
                input.addEventListener('change', function(){
                  if (input.files && input.files[0]) {
                    label.textContent = input.files[0].name;
                  }
                });
              }
            })();
          `
        }}
      ></script>
    </>,
    { title: `Student Portal — ${student.name}`, noindex: true }
  )
})

// ---------------------------------------------------------------------
// Student-initiated document upload. Token-gated (not admin-session
// gated) — anyone with the private link can upload on this student's
// behalf, which is the intended "no login" UX. Rate-limiting is not
// applied here since this is a low-value, low-abuse-risk endpoint
// (only stores a file against an existing student record).
// ---------------------------------------------------------------------
portalPage.post('/portal/:token/upload', async (c) => {
  const token = c.req.param('token')
  const student = await c.env.DB.prepare('SELECT id FROM students WHERE access_token = ?').bind(token).first<{ id: number }>()

  if (!student) return c.redirect(`/portal/${token}`)

  const formData = await c.req.formData()
  const docName = String(formData.get('doc_name') || '').trim()
  const file = formData.get('file')

  if (!docName || !file || typeof file === 'string') {
    return c.redirect(`/portal/${token}?error=Please choose a file and enter a document name.`)
  }

  const result = await handleDocumentUpload(c.env.UPLOADS, file as File, `students/${student.id}`)
  if (!result.ok) {
    return c.redirect(`/portal/${token}?error=${encodeURIComponent(result.error || 'Upload failed.')}`)
  }

  await c.env.DB.prepare(
    `INSERT INTO student_documents (student_id, doc_name, file_url, uploaded_by, uploaded_by_name) VALUES (?, ?, ?, 'student', NULL)`
  )
    .bind(student.id, docName, result.url)
    .run()

  return c.redirect(`/portal/${token}?flash=Document uploaded successfully.`)
})

export default portalPage
