// =====================================================================
// Serves images stored in the R2 UPLOADS bucket at /uploads/:key
// (admin-uploaded visa posters, student photos, news cover images).
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'

const uploads = new Hono<{ Bindings: Bindings }>()

uploads.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, '')
  if (!key) return c.notFound()

  const object = await c.env.UPLOADS.get(key)
  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
})

export default uploads
