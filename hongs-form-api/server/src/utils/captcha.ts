import type { CaptchaOrdeal, CaptchaAnswer, CaptchaResult, CaptchaConfig } from 'hongs-captcha';
import { CaptchaCodes } from 'hongs-captcha';
import { roster } from './roster.js';

const CAPTCHA_PREFIX = 'captcha:';

class RosterStorage {
  async set(ordeal: CaptchaOrdeal): Promise<void> {
    const key = `${CAPTCHA_PREFIX}${ordeal.id}`;
    const ttl = Math.ceil((ordeal.expiresAt - Date.now()) / 1000);
    await roster.set(key, ordeal, ttl);
  }

  async get(id: string): Promise<CaptchaOrdeal | null> {
    const key = `${CAPTCHA_PREFIX}${id}`;
    return await roster.get(key);
  }

  async delete(id: string): Promise<void> {
    const key = `${CAPTCHA_PREFIX}${id}`;
    await roster.delete(key);
  }

  async cleanup(): Promise<void> {
    await roster.cleanup();
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function generateToken(id: string, expiresIn: number = 300): string {
  const token = {
    id,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresIn * 1000
  };
  return btoa(JSON.stringify(token));
}

export class CaptchaServer {
  private storage: RosterStorage;
  private config: Required<CaptchaConfig>;

  constructor(config?: CaptchaConfig) {
    this.config = {
      width: config?.width ?? 320,
      height: config?.height ?? 180,
      tolerance: config?.tolerance ?? 5,
      expiresIn: config?.expiresIn ?? 300
    };

    this.storage = new RosterStorage();
  }

  async generateOrdeal(): Promise<CaptchaOrdeal> {
    const blockSize = 40;
    const padding = 10;
    const targetX = Math.random() * (this.config.width - blockSize - padding * 2) + padding;
    const targetY = Math.random() * (this.config.height - blockSize - padding * 2) + padding;

    const ordeal: CaptchaOrdeal = {
      id: generateId(),
      targetX,
      targetY,
      width: blockSize,
      height: blockSize,
      expiresAt: Date.now() + this.config.expiresIn * 1000
    };

    await this.storage.set(ordeal);
    return ordeal;
  }

  async verify(answer: CaptchaAnswer): Promise<CaptchaResult> {
    const ordeal = await this.storage.get(answer.id);

    if (!ordeal) {
      return {
        success: false,
        message: 'Captcha not found or expired',
        code: CaptchaCodes.NOT_FOUND
      };
    }

    if (ordeal.expiresAt < Date.now()) {
      await this.storage.delete(answer.id);
      return {
        success: false,
        message: 'Captcha expired',
        code: CaptchaCodes.EXPIRED
      };
    }

    const diff = Math.abs(answer.x - ordeal.targetX);

    if (diff > this.config.tolerance) {
      await this.storage.delete(answer.id);
      return {
        success: false,
        message: 'Verification failed',
        code: CaptchaCodes.INVALID
      };
    }

    await this.storage.delete(answer.id);
    const token = generateToken(answer.id);

    return {
      success: true,
      token,
      message: 'Verification successful',
      code: CaptchaCodes.SUCCESS
    };
  }

  async verifyToken(token: string): Promise<boolean> {
    try {
      const data = JSON.parse(atob(token)) as { expiresAt: number };
      return data.expiresAt >= Date.now();
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    await this.storage.cleanup();
  }
}

export const captchaServer = new CaptchaServer();
