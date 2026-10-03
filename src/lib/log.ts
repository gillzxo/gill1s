// =====================================================================
// Activity logging — every admin mutation is recorded for audit.
// =====================================================================
import type { AdminSessionUser } from './auth'

export async function logActivity(
  db: D1Database,
  admin: AdminSessionUser | null,
  action: string,
  entity: string,
  entityId: string | number | null,
  details: Record<string, unknown> | null,
  ipAddress: string | null
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO activity_logs (admin_id, admin_name, action, entity, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        admin?.id ?? null,
        admin?.name ?? 'system',
        action,
        entity,
        entityId !== null ? String(entityId) : null,
        details ? JSON.stringify(details) : null,
        ipAddress
      )
      .run()
  } catch (err) {
    // Logging must never break the actual request
    console.error('activity log failed', err)
  }
}
