// =====================================================================
// Admin login / logout routes.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings, AdminUser } from '../lib/types'
import { verifyPassword, createSession, destroySession, hashPassword } from '../lib/auth'
import { loginSchema } from '../lib/validation'
import { getClientIp, isRateLimited } from '../lib/ratelimit'
import { logActivity } from '../lib/log'

const auth = new Hono<{ Bindings: Bindings }>()

function loginPage(error?: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Admin Login | 1st Choice IELTS & Immigration</title>
  <meta name="robots" content="noindex,nofollow" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: { brand: { blue:'#0b2559', bluedark:'#061534', red:'#f70009', reddark:'#c40007' } },
    fontFamily: { sans: ['Inter','system-ui','sans-serif'], display: ['Poppins','system-ui','sans-serif'] } } } }
  </script>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <style>body{font-family:'Inter',sans-serif}.font-display{font-family:'Poppins',sans-serif}</style>
</head>
<body class="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-bluedark to-brand-blue p-4">
  <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
    <div class="text-center mb-8">
      <img src="/static/images/logo.png" alt="1st Choice" class="h-16 w-auto mx-auto mb-4" />
      <h1 class="font-display font-bold text-xl text-brand-blue">Admin Portal Login</h1>
      <p class="text-slate-400 text-sm mt-1">Sign in to manage your website</p>
    </div>
    ${error ? `<div class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">${escapeHtml(error)}</div>` : ''}
    <form method="post" action="/admin/login" class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
        <input type="email" name="email" required class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none" placeholder="admin@1stchoiceimmigration.com" />
      </div>
      <div>
        <label class="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
        <input type="password" name="password" required class="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none" placeholder="••••••••" />
      </div>
      <button type="submit" class="w-full bg-brand-red hover:bg-brand-reddark text-white font-bold py-3.5 rounded-lg transition-colors">
        Sign In
      </button>
    </form>
    <p class="text-center text-xs text-slate-400 mt-6">
      <a href="/" class="hover:text-brand-red">&larr; Back to website</a>
    </p>
  </div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

auth.get('/login', async (c) => {
  // One-time bootstrap: if there are zero admin users, create the default
  // owner account now (using the ADMIN_BOOTSTRAP_SECRET-free default
  // credentials documented in the README) so the portal is never locked.
  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM admin_users').first<{ cnt: number }>()
  if (!countRow || countRow.cnt === 0) {
    const hash = await hashPassword('Admin@12345')
    await c.env.DB.prepare(
      `INSERT INTO admin_users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'owner', 1)`
    )
      .bind('Owner', 'admin@1stchoiceimmigration.com', hash)
      .run()
  }

  return c.html(loginPage())
})

auth.post('/login', async (c) => {
  const ip = getClientIp(c.req.raw)
  const limited = await isRateLimited(c.env.DB, ip, 'admin_login', 8, 15)
  if (limited) {
    return c.html(loginPage('Too many login attempts. Please try again in a few minutes.'), 429)
  }

  const formData = await c.req.formData()
  const parsed = loginSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) {
    return c.html(loginPage('Please enter a valid email and password.'), 400)
  }

  const { email, password } = parsed.data
  const user = await c.env.DB.prepare('SELECT * FROM admin_users WHERE email = ? AND is_active = 1')
    .bind(email.toLowerCase())
    .first<AdminUser>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await logActivity(c.env.DB, null, 'login.failed', 'admin_users', email, { ip }, ip)
    return c.html(loginPage('Invalid email or password.'), 401)
  }

  await createSession(c, c.env.DB, user.id)
  await c.env.DB.prepare("UPDATE admin_users SET last_login_at = datetime('now') WHERE id = ?").bind(user.id).run()
  await logActivity(c.env.DB, { id: user.id, name: user.name, email: user.email, role: user.role as 'owner' | 'staff' }, 'login.success', 'admin_users', user.id, null, ip)

  return c.redirect('/admin')
})

auth.post('/logout', async (c) => {
  await destroySession(c, c.env.DB)
  return c.redirect('/admin/login')
})

export default auth
