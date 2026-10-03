// =====================================================================
// Admin image upload API — used by the dropzone widgets across Visa
// Results, Coaching Results, News, and Countries admin screens.
// =====================================================================
import { Hono } from 'hono'
import type { Bindings } from '../lib/types'
import { requireAdmin } from './middleware'
import { handleImageUpload } from '../lib/upload'

const upload = new Hono<{ Bindings: Bindings }>()

upload.use('*', requireAdmin)

upload.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData()
    const file = formData.get('file')
    const folder = (formData.get('folder') as string) || 'misc'

    if (!file || typeof file === 'string') {
      return c.json({ ok: false, error: 'No file provided' }, 400)
    }

    const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'misc'
    const result = await handleImageUpload(c.env.UPLOADS, file as File, safeFolder)

    if (!result.ok) {
      return c.json({ ok: false, error: result.error }, 400)
    }

    return c.json({ ok: true, url: result.url, key: result.key })
  } catch (err) {
    console.error('Admin upload failed', err)
    return c.json({ ok: false, error: 'Upload failed. Please try again.' }, 500)
  }
})

export default upload
