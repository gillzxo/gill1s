// =====================================================================
// Simple D1-backed rate limiter for public endpoints (e.g. the enquiry
// form). Limits a single IP to N submissions per route within a sliding
// window. Good enough to stop basic bot abuse without extra infra.
// =====================================================================

export async function isRateLimited(
  db: D1Database,
  ipAddress: string,
  route: string,
  maxAttempts = 5,
  windowMinutes = 10
): Promise<boolean> {
  // Clean old entries for this ip+route lazily (cheap, indexed)
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()

  const row = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM rate_limits WHERE ip_address = ? AND route = ? AND created_at > ?`
    )
    .bind(ipAddress, route, since)
    .first<{ cnt: number }>()

  if ((row?.cnt ?? 0) >= maxAttempts) {
    return true
  }

  await db.prepare('INSERT INTO rate_limits (ip_address, route) VALUES (?, ?)').bind(ipAddress, route).run()

  return false
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  )
}
