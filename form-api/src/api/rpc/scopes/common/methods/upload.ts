import { z } from 'zod'
import { registerCommonMethod } from '../registry.js'
import { roster } from '../../../../../utils/roster.js'
import { uploadDriver, generateToken } from '../../../../../utils/upload/index.js'
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, RATE_LIMITS, SCENE_QUOTA, type UploadScene, type UploadType } from '../../../../../utils/upload/types.js'

const getConfigSchema = z.object({
  fileHash: z.string().min(1),
  fileSize: z.number().positive(),
  fileName: z.string().min(1),
  type: z.enum(['image', 'file']),
  scene: z.enum(['form', 'avatar', 'common'])
})

function getClientIp(request: any): string {
  return request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.headers?.['x-real-ip'] ||
    'unknown'
}

function getUserId(request: any): string | null {
  return request.user?.id || null
}

function getTimeKey(minutes: boolean = false): string {
  const now = new Date()
  if (minutes) {
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
  }
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}`
}

registerCommonMethod('upload.getConfig', async (params: unknown, request: any) => {
  const validated = getConfigSchema.parse(params)

  const ip = getClientIp(request)
  const userId = getUserId(request)
  const { fileHash, fileSize, fileName, type, scene } = validated

  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const allowedExts = ALLOWED_EXTENSIONS[type as UploadType]
  if (!allowedExts.includes(ext)) {
    throw new Error(`不支持的文件类型: .${ext}`)
  }

  const maxSize = MAX_FILE_SIZE[scene as UploadScene][type as UploadType]
  if (maxSize > 0 && fileSize > maxSize) {
    throw new Error(`文件大小超过限制: 最大 ${Math.round(maxSize / 1024 / 1024)}MB`)
  }

  const ipMinuteKey = `upload:rip:${ip}:c:${getTimeKey(true)}`
  const ipHourKey = `upload:rip:${ip}:c:${getTimeKey(false)}`
  const ipUploadKey = `upload:rip:${ip}:u:${getTimeKey(false)}`

  const ipMinute = (await roster.get(ipMinuteKey)) || { count: 0 }
  if (ipMinute.count >= RATE_LIMITS.ip.config_per_minute) {
    throw new Error('请求过于频繁，请稍后再试')
  }

  const ipHour = (await roster.get(ipHourKey)) || { count: 0 }
  if (ipHour.count >= RATE_LIMITS.ip.config_per_hour) {
    throw new Error('请求过于频繁，请稍后再试')
  }

  const ipUpload = (await roster.get(ipUploadKey)) || { count: 0 }
  if (ipUpload.count >= RATE_LIMITS.ip.upload_per_hour) {
    throw new Error('上传次数超过限制，请稍后再试')
  }

  await roster.set(ipMinuteKey, { count: ipMinute.count + 1 }, 60)
  await roster.set(ipHourKey, { count: ipHour.count + 1 }, 3600)
  await roster.set(ipUploadKey, { count: ipUpload.count + 1 }, 3600)

  if (userId) {
    const userHourKey = `upload:ru:${userId}:c:${getTimeKey(false)}`
    const userUploadKey = `upload:ru:${userId}:u:${getTimeKey(false)}`

    const userHour = (await roster.get(userHourKey)) || { count: 0 }
    if (userHour.count >= RATE_LIMITS.user.config_per_hour) {
      throw new Error('请求过于频繁，请稍后再试')
    }

    const userUpload = (await roster.get(userUploadKey)) || { count: 0 }
    if (userUpload.count >= RATE_LIMITS.user.upload_per_hour) {
      throw new Error('上传次数超过限制，请稍后再试')
    }

    await roster.set(userHourKey, { count: userHour.count + 1 }, 3600)
    await roster.set(userUploadKey, { count: userUpload.count + 1 }, 3600)
  }

  const hashKey = `upload:h:${fileHash}`
  const existingFile = await roster.get(hashKey)
  if (existingFile && existingFile.scene === scene) {
    return {
      token: null,
      url: existingFile.url,
      exists: true
    }
  }

  const token = generateToken(fileHash, fileSize, fileName, type as UploadType, scene as UploadScene)
  const tokenKey = `upload:t:${token.token}`
  await roster.set(tokenKey, token, 300)

  const config = await uploadDriver.getUploadConfig(scene as UploadScene)

  return {
    token: token.token,
    url: null,
    exists: false,
    uploadUrl: config.uploadUrl,
    host: config.host,
    dir: config.dir,
    expiresAt: token.expiresAt
  }
})