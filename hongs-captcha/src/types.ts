export interface CaptchaConfig {
  width?: number
  height?: number
  tolerance?: number  // 容差值（像素）
  expiresIn?: number   // 过期时间（秒）
}

export interface CaptchaOrdeal {
  id: string
  targetX: number
  targetY: number
  width: number
  height: number
  expiresAt: number
  bgImage?: string
  blockImage?: string
}

export interface CaptchaAnswer {
  id: string
  x: number
  y: number
  trail?: Array<{
    x: number
    y: number
    t: number
  }>
}

export interface CaptchaResult {
  success: boolean
  token?: string
  message?: string
  code?: string
}

export interface CaptchaToken {
  id: string
  createdAt: number
  expiresAt: number
}

export const CaptchaCodes = {
  SUCCESS: 'success',
  NOT_FOUND: 'not_found',
  EXPIRED: 'expired',
  INVALID: 'invalid'
} as const

export type CaptchaCode = typeof CaptchaCodes[keyof typeof CaptchaCodes]
