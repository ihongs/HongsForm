import type { CaptchaOrdeal } from './types'

export interface Storage {
  set(ordeal: CaptchaOrdeal): Promise<void>
  get(id: string): Promise<CaptchaOrdeal | null>
  delete(id: string): Promise<void>
  cleanup(): Promise<void>
}

export class MemoryStorage implements Storage {
  private store = new Map<string, CaptchaOrdeal>()

  async set(ordeal: CaptchaOrdeal): Promise<void> {
    this.store.set(ordeal.id, ordeal)
  }

  async get(id: string): Promise<CaptchaOrdeal | null> {
    return this.store.get(id) || null
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id)
  }

  async cleanup(): Promise<void> {
    const now = Date.now()
    for (const [id, ordeal] of this.store) {
      if (ordeal.expiresAt < now) {
        this.store.delete(id)
      }
    }
  }
}
