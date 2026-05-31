import { loadEnv } from './env.js';

const env = loadEnv();

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const isDev = env.NODE_ENV === 'development';

  if (isDev) {
    console.log('=== Development Mode: Email ===');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html}`);
    if (text) console.log(`Text: ${text}`);
    console.log('================================');
    return;
  }

  // 生产环境发送邮件逻辑，需要安装 nodemailer
  // 这里先空实现，后续需要时再补充
  console.warn('Email sending not implemented in production');
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
