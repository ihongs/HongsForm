import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { UploadDriver, UploadConfig, UploadScene } from '../types.js'

export class LocalUploadDriver implements UploadDriver {
  private baseUrl: string
  private uploadDir: string

  constructor(baseUrl: string = '', uploadDir: string = 'public/upload') {
    this.baseUrl = baseUrl
    this.uploadDir = uploadDir
  }

  getType(): 'local' {
    return 'local'
  }

  async getUploadConfig(_scene: UploadScene): Promise<UploadConfig> {
    return {
      type: 'local',
      uploadUrl: `${this.baseUrl}/api/upload`,
      host: this.baseUrl,
      dir: this.uploadDir
    }
  }

  validateFile(file: File, scene: UploadScene): { valid: boolean; error?: string } {
    return { valid: true }
  }

  generateFileName(originalName: string): string {
    const ext = originalName.split('.').pop()?.toLowerCase() || ''
    const uuid = randomUUID()
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
    return `${date}/${uuid}.${ext}`
  }

  getFilePath(scene: UploadScene, fileName: string): string {
    return resolve(this.uploadDir, scene, fileName)
  }
}