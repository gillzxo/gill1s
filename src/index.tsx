// TEMPORARY MINIMAL TEST FILE - replaces src/index.tsx only to find the crash.
// It has no page imports. Restore the real index.tsx afterwards.
import { Hono } from 'hono'

const app = new Hono<{ Bindings: { DB: any; UPLOADS: any } }>()

app.onError((err, c) => {
  return c.text('ERROR: ' + err.message + '\n\n' + err.stack, 500)
})

app.get('/', (c) => c.text('minimal app is running'))
app.get('/ping', (c) => c.text('ok'))

// Tests the database connection only
app.get('/db', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM site_settings').first()
  return c.json(row)
})

export default app
