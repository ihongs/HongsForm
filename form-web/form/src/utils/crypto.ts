import { sha256 } from 'js-sha256'

/**
 * SHA-256 哈希函数
 * 使用 js-sha256 库，兼容所有环境
 */
export async function computeSha256(str: string): Promise<string> {
  return sha256(str)
}

export { sha256 as sha256Sync }
