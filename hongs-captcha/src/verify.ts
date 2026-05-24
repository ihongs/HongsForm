import type { CaptchaOrdeal, CaptchaAnswer, CaptchaResult, CaptchaConfig } from './types'
import { CaptchaCodes } from './types'
import { MemoryStorage, type Storage } from './storage'

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateToken(id: string, expiresIn: number = 300): string {
  const token = {
    id,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000
  }
  return btoa(JSON.stringify(token))
}

export class CaptchaServer {
  private storage: Storage
  private config: Required<CaptchaConfig>

  constructor(config?: CaptchaConfig & { storage?: Storage | 'memory' }) {
    this.config = {
      width: config?.width ?? 320,
      height: config?.height ?? 180,
      tolerance: config?.tolerance ?? 5,
      expiresIn: config?.expiresIn ?? 300
    }

    if (config?.storage && typeof config.storage !== 'string') {
      this.storage = config.storage
    } else {
      this.storage = new MemoryStorage()
    }
  }

  async generateOrdeal(): Promise<CaptchaOrdeal> {
    const blockSize = 50
    const padding = 10
    const targetX = Math.random() * (this.config.width - blockSize - padding * 2) + padding
    const targetY = Math.random() * (this.config.height - blockSize - padding * 2) + padding

    const ordeal: CaptchaOrdeal = {
      id: generateId(),
      targetX,
      targetY,
      width: blockSize,
      height: blockSize,
      expiresAt: Date.now() + this.config.expiresIn * 1000
    }

    await this.storage.set(ordeal)
    return ordeal
  }

  async verify(answer: CaptchaAnswer): Promise<CaptchaResult> {
    const ordeal = await this.storage.get(answer.id)

    if (!ordeal) {
      return {
        success: false,
        message: '验证码不存在或已过期',
        code: CaptchaCodes.NOT_FOUND
      }
    }

    if (ordeal.expiresAt < Date.now()) {
      await this.storage.delete(answer.id)
      return {
        success: false,
        message: '验证码已过期',
        code: CaptchaCodes.EXPIRED
      }
    }

    const diff = Math.abs(answer.x - ordeal.targetX)

    if (diff > this.config.tolerance) {
      await this.storage.delete(answer.id)
      return {
        success: false,
        message: '验证失败',
        code: CaptchaCodes.INVALID
      }
    }

    await this.storage.delete(answer.id)
    const token = generateToken(answer.id)

    return {
      success: true,
      token,
      message: '验证成功',
      code: CaptchaCodes.SUCCESS
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const data = JSON.parse(atob(token)) as { expiresAt: number }
      return data.expiresAt >= Date.now()
    } catch {
      return false
    }
  }

  async cleanup(): Promise<void> {
    await this.storage.cleanup()
  }
}
