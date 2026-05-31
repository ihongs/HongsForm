import { randomUUID } from 'node:crypto'
import { LocalUploadDriver } from './drivers/local.js'
import type { UploadDriver, UploadScene, UploadConfig, UploadToken, UploadType } from './types.js'

export * from './types.js'

export const uploadDriver: UploadDriver = new LocalUploadDriver()

export function getUploadDriver(): UploadDriver {
  return uploadDriver
}

export function generateToken(fileHash: string, fileSize: number, fileName: string, type: UploadType, scene: UploadScene): UploadToken {
  return {
    token: randomUUID(),
    fileHash,
    fileSize,
    fileName,
    type,
    scene,
    used: false,
    expiresAt: Date.now() + 5 * 60 * 1000,
    createdAt: Date.now()
  }
}