export type UploadScene = 'form' | 'avatar' | 'common'

export type UploadType = 'image' | 'file'

export interface UploadToken {
  token: string
  fileHash: string
  fileSize: number
  fileName: string
  type: UploadType
  scene: UploadScene
  used: boolean
  expiresAt: number
  createdAt: number
}

export interface UploadConfig {
  type: 'local'
  uploadUrl: string
  host: string
  dir: string
}

export interface UploadDriver {
  getType(): 'local'
  getUploadConfig(scene: UploadScene): Promise<UploadConfig>
  validateFile(file: File, scene: UploadScene): { valid: boolean; error?: string }
  generateFileName(originalName: string): string
  getFilePath(scene: UploadScene, fileName: string): string
}

export interface RateLimitRecord {
  [scene: string]: {
    c_h: number
    c_m: number
    u_h: number
    updatedAt: number
  }
}

export const ALLOWED_EXTENSIONS: Record<UploadType, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  file: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar']
}

export const ALLOWED_MIME_TYPES: Record<UploadType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  file: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'application/zip', 'application/x-rar-compressed']
}

export const MAX_FILE_SIZE: Record<UploadScene, Record<UploadType, number>> = {
  form: { image: 5 * 1024 * 1024, file: 20 * 1024 * 1024 },
  avatar: { image: 5 * 1024 * 1024, file: 0 },
  common: { image: 5 * 1024 * 1024, file: 20 * 1024 * 1024 }
}

export const SCENE_QUOTA: Record<UploadScene, { user: number; ip: number }> = {
  form: { user: 200 * 1024 * 1024, ip: 100 * 1024 * 1024 },
  avatar: { user: 10 * 1024 * 1024, ip: 20 * 1024 * 1024 },
  common: { user: 100 * 1024 * 1024, ip: 50 * 1024 * 1024 }
}

export const RATE_LIMITS: Record<'ip' | 'user', { config_per_minute: number; config_per_hour: number; upload_per_hour: number }> = {
  ip: { config_per_minute: 5, config_per_hour: 50, upload_per_hour: 100 },
  user: { config_per_minute: 20, config_per_hour: 200, upload_per_hour: 500 }
}