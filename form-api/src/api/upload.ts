import { IncomingMessage, ServerResponse } from 'node:http'
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { IncomingForm } from 'formidable'
import { roster } from '../utils/roster.js'
import { uploadDriver } from '../utils/upload/index.js'
import { ALLOWED_EXTENSIONS, type UploadToken, type UploadType } from '../utils/upload/types.js'

export async function handleUploadRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

  const token = req.headers['x-upload-token'] as string

  if (!token) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Missing upload token' }))
    return
  }

  const tokenKey = `upload:t:${token}`
  const tokenData = await roster.get(tokenKey) as UploadToken | null

  if (!tokenData) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Invalid or expired token' }))
    return
  }

  if (tokenData.used) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Token already used' }))
    return
  }

  if (Date.now() > tokenData.expiresAt) {
    res.statusCode = 401
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Token expired' }))
    return
  }

  const form = new IncomingForm()

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Failed to parse form data' }))
      return
    }

    const file = files.file
    if (!file) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'No file provided' }))
      return
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file

    const actualSize = uploadedFile.size
    if (actualSize !== tokenData.fileSize) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'File size mismatch' }))
      return
    }

    const ext = uploadedFile.originalFilename?.split('.').pop()?.toLowerCase() || ''
    const allowedExts = ALLOWED_EXTENSIONS[tokenData.type as UploadType]
    if (!allowedExts.includes(ext)) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: `Unsupported file type: .${ext}` }))
      return
    }

    const fileName = uploadDriver.generateFileName(uploadedFile.originalFilename || `file.${ext}`)
    const filePath = uploadDriver.getFilePath(tokenData.scene, fileName)

    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const originalPath = uploadedFile.filepath
    const fileBuffer = readFileSync(originalPath)
    writeFileSync(filePath, fileBuffer)

    const url = `/upload/${tokenData.scene}/${fileName}`

    await roster.set(tokenKey, { ...tokenData, used: true }, 60)

    const hashKey = `upload:h:${tokenData.fileHash}`
    await roster.set(hashKey, { url, scene: tokenData.scene, createdAt: Date.now() }, 30 * 24 * 3600)

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ url, success: true }))
  })
}