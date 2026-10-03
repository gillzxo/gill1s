// =====================================================================
// Admin auth guard — redirects to /admin/login if no valid session.
// =====================================================================
import type { Context, Next } from 'hono'
import type { Bindings } from '../lib/types'
import { getSessionUser } from '../lib/auth'

export async function requireAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = await getSessionUser(c, c.env.DB)
  if (!user) {
    return c.redirect('/admin/login')
  }
  c.set('adminUser' as never, user as never)
  await next()
}

export async function requireOwner(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = await getSessionUser(c, c.env.DB)
  if (!user) {
    return c.redirect('/admin/login')
  }
  if (user.role !== 'owner') {
    return c.text('Forbidden — Owner access required', 403)
  }
  c.set('adminUser' as never, user as never)
  await next()
}
