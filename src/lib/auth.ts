// =====================================================================
// Authentication helpers — password hashing (PBKDF2 via Web Crypto,
// available natively in the Cloudflare Workers runtime) and session
// management backed by the D1 `sessions` table + an HttpOnly cookie.
// =====================================================================
import type { Context } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'

const PBKDF2_ITERATIONS = 210_000
const SESSION_COOKIE = 'fc_admin_session'
const SESSION_TTL_HOURS = 12

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/** Hash a plaintext password → "pbkdf2$<iterations>$<saltHex>$<hashHex>" */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt.buffer as ArrayBuffer)}$${toHex(derived)}`
}

/** Verify a plaintext password against a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false
  const iterations = parseInt(parts[1], 10)
  const salt = fromHex(parts[2])
  const expectedHex = parts[3]

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  const actualHex = toHex(derived)

  // Constant-time compare
  if (actualHex.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < actualHex.length; i++) {
    diff |= actualHex.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  }
  return diff === 0
}

function randomToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer)
}

export interface AdminSessionUser {
  id: number
  name: string
  email: string
  role: 'owner' | 'staff'
}

/** Create a new session row + set the cookie on the response context. */
export async function createSession(c: Context, db: D1Database, adminId: number): Promise<string> {
  const token = randomToken()
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000)
  await db
    .prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, adminId, expires.toISOString())
    .run()

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600
  })
  return token
}

/** Read the current session cookie and resolve the logged-in admin, if any. */
export async function getSessionUser(c: Context, db: D1Database): Promise<AdminSessionUser | null> {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) return null

  const row = await db
    .prepare(
      `SELECT s.expires_at as expires_at, a.id as id, a.name as name, a.email as email, a.role as role, a.is_active as is_active
       FROM sessions s JOIN admin_users a ON a.id = s.admin_id
       WHERE s.id = ?`
    )
    .bind(token)
    .first<{ expires_at: string; id: number; name: string; email: string; role: string; is_active: number }>()

  if (!row) return null
  if (!row.is_active) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
    return null
  }

  return { id: row.id, name: row.name, email: row.email, role: row.role as 'owner' | 'staff' }
}

/** Destroy the current session (logout). */
export async function destroySession(c: Context, db: D1Database): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
  }
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

/** Periodic cleanup of expired sessions (best-effort, non-blocking). */
export async function cleanExpiredSessions(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()
}
