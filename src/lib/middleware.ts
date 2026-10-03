// =====================================================================
// Shared middleware: loads site settings into context for every request
// so the renderer and pages can read them without a repeat DB hit.
// =====================================================================
import type { Context, Next } from 'hono'
import type { Bindings } from './types'
import { getSettings } from './settings'

export async function loadSettings(c: Context<{ Bindings: Bindings }>, next: Next) {
  const settings = await getSettings(c.env.DB)
  c.set('settings', settings)
  await next()
}
