import { loadEnv } from './env.js';

const env = loadEnv();

export async function sendSms(phone: string, templateId: string, params: Record<string, any>): Promise<void> {
  const isDev = env.NODE_ENV === 'development';

  if (isDev) {
    console.log('=== Development Mode: SMS ===');
    console.log(`Phone: ${phone}`);
    console.log(`Template ID: ${templateId}`);
    console.log(`Params:`, params);
    console.log('==============================');
    return;
  }

  // 生产环境短信发送逻辑
  console.warn('SMS sending not implemented in production');
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
