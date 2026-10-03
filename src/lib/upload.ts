// =====================================================================
// R2 image upload helper — validates type/size, generates a unique key,
// and stores objects in the UPLOADS bucket. Public access is served via
// the /uploads/:key route defined in src/routes/uploads.ts.
// =====================================================================
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

export interface UploadResult {
  ok: boolean
  key?: string
  url?: string
  error?: string
}

function extFromType(type: string): string {
  switch (type) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'bin'
  }
}

export async function handleImageUpload(
  bucket: R2Bucket,
  file: File,
  folder: string
): Promise<UploadResult> {
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No file provided' }
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'Only JPG, PNG, WEBP, or GIF images are allowed' }
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: 'Image must be smaller than 5MB' }
  }

  const ext = extFromType(file.type)
  const randomId = crypto.randomUUID()
  const key = `${folder}/${Date.now()}-${randomId}.${ext}`

  const buffer = await file.arrayBuffer()
  await bucket.put(key, buffer, {
    httpMetadata: { contentType: file.type }
  })

  return { ok: true, key, url: `/uploads/${key}` }
}
