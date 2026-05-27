import { roster } from './roster.js';
import { createHash, randomBytes } from 'node:crypto';

// ============= 通用配置 =============
const MAX_PER_HOUR = 5;
const EXPIRE_1H = 3600;
const EXPIRE_10M = 600;
const MIN_INTERVAL_SECONDS = 55;

// 滑块验证码配置
const SLIDER_WIDTH = 50;
const SLIDER_HEIGHT = 50;
const CAPTCHA_WIDTH = 300;
const CAPTCHA_HEIGHT = 150;
const ALLOWED_DEVIATION = 10;

// 算力验证配置
const DIFFICULTY = 4;

// ============= 基础工具函数 =============

/**
 * 生成随机验证码
 */
export function generateCode(length = 6): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}

/**
 * 生成 MD5 哈希
 */
export function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

/**
 * 生成 SHA256 哈希
 */
export function sha256(str: string): string {
  return createHash('sha256').update(str).digest('hex');
}

/**
 * 生成随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机颜色
 */
export function randomColor(): string {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r}, ${g}, ${b})`;
}

// ============= 滑块验证码相关 =============

/**
 * 滑块验证码配置
 */
export interface SlideCaptchaConfig {
  captchaId: string;
  backgroundImage: string;
  sliderImage: string;
  sliderWidth: number;
  sliderHeight: number;
  captchaWidth: number;
  captchaHeight: number;
}

/**
 * 生成滑块验证码
 */
export function generateSlideCaptcha(): SlideCaptchaConfig {
  const captchaId = randomBytes(16).toString('hex');
  
  // 计算滑块位置（留出边界）
  const sliderX = randomInt(SLIDER_WIDTH, CAPTCHA_WIDTH - SLIDER_WIDTH * 2);
  const sliderY = randomInt(SLIDER_HEIGHT / 2, CAPTCHA_HEIGHT - SLIDER_HEIGHT / 2);
  
  // 保存正确答案到缓存
  roster.set(`verify.slide.${captchaId}`, { x: sliderX, y: sliderY }, EXPIRE_10M);
  
  // 生成背景SVG - 使用气泡效果
  const bgColor = '#f5f5f5';
  const bubbles: string[] = [];
  
  for (let i = 0; i < 30; i++) {
    const bubbleColor = randomColor();
    const cx = randomInt(0, CAPTCHA_WIDTH);
    const cy = randomInt(0, CAPTCHA_HEIGHT);
    const r = randomInt(5, 25);
    const opacity = Math.random() * 0.5 + 0.3;
    bubbles.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${bubbleColor}" fill-opacity="${opacity}"/>`);
  }
  
  // 目标圆的颜色（明显区分于背景）
  const targetColor = '#e74c3c';
  const targetRadius = SLIDER_WIDTH / 2;
  
  // 背景图（包含目标圆）
  const backgroundSvg = `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${CAPTCHA_WIDTH}" height="${CAPTCHA_HEIGHT}" viewBox="0 0 ${CAPTCHA_WIDTH} ${CAPTCHA_HEIGHT}">
      <rect width="${CAPTCHA_WIDTH}" height="${CAPTCHA_HEIGHT}" fill="${bgColor}"/>
      ${bubbles.join('')}
      <!-- 目标圆 - 三个等间距同心圆 -->
      <circle cx="${sliderX + targetRadius}" cy="${sliderY + targetRadius}" r="${targetRadius}" fill="${targetColor}" fill-opacity="0.7"/>
      <circle cx="${sliderX + targetRadius}" cy="${sliderY + targetRadius}" r="${targetRadius - 6}" fill="none" stroke="#fff" stroke-width="2"/>
      <circle cx="${sliderX + targetRadius}" cy="${sliderY + targetRadius}" r="${targetRadius - 12}" fill="none" stroke="#fff" stroke-width="1.5"/>
      <circle cx="${sliderX + targetRadius}" cy="${sliderY + targetRadius}" r="${targetRadius - 18}" fill="none" stroke="#fff" stroke-width="1"/>
    </svg>
  `).toString('base64')}`;
  
  // 滑块SVG（瞄准镜样式）
  const sliderSvg = `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${SLIDER_WIDTH}" height="${SLIDER_HEIGHT}" viewBox="0 0 ${SLIDER_WIDTH} ${SLIDER_HEIGHT}">
      <!-- 瞄准镜外圈 - 更透明 -->
      <circle cx="${SLIDER_WIDTH / 2}" cy="${SLIDER_HEIGHT / 2}" r="${targetRadius}" fill="rgba(39, 174, 96, 0.5)"/>
      <circle cx="${SLIDER_WIDTH / 2}" cy="${SLIDER_HEIGHT / 2}" r="${targetRadius - 2}" fill="none" stroke="#fff" stroke-width="2" stroke-opacity="0.8"/>
      <!-- 十字准星 -->
      <line x1="${SLIDER_WIDTH / 2}" y1="5" x2="${SLIDER_WIDTH / 2}" y2="${SLIDER_HEIGHT - 5}" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-opacity="0.9"/>
      <line x1="5" y1="${SLIDER_HEIGHT / 2}" x2="${SLIDER_WIDTH - 5}" y2="${SLIDER_HEIGHT / 2}" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-opacity="0.9"/>
      <!-- 中心点 -->
      <circle cx="${SLIDER_WIDTH / 2}" cy="${SLIDER_HEIGHT / 2}" r="5" fill="#fff" fill-opacity="0.9"/>
      <circle cx="${SLIDER_WIDTH / 2}" cy="${SLIDER_HEIGHT / 2}" r="2.5" fill="${targetColor}"/>
    </svg>
  `).toString('base64')}`;
  
  return {
    captchaId,
    backgroundImage: backgroundSvg,
    sliderImage: sliderSvg,
    sliderWidth: SLIDER_WIDTH,
    sliderHeight: SLIDER_HEIGHT,
    captchaWidth: CAPTCHA_WIDTH,
    captchaHeight: CAPTCHA_HEIGHT,
  };
}

/**
 * 验证滑块位置
 */
export async function verifySlidePosition(captchaId: string, userX: number): Promise<boolean> {
  const storedData = await roster.get(`verify.slide.${captchaId}`);
  
  if (!storedData) {
    throw new Error('验证码已过期或不存在');
  }
  
  const correctX = storedData.x;
  const deviation = Math.abs(userX - correctX);
  
  // 删除已验证的验证码，防止重复使用
  await roster.remove(`verify.slide.${captchaId}`);
  
  return deviation <= ALLOWED_DEVIATION;
}

/**
 * 生成滑块验证通过的令牌
 */
export async function generateSlideVerifyToken(): Promise<string> {
  const verifyToken = randomBytes(20).toString('hex');
  await roster.set(`verify.slide.token.${verifyToken}`, 1, EXPIRE_10M);
  return verifyToken;
}

/**
 * 验证滑块验证码令牌
 */
export async function verifySlideToken(verifyToken: string): Promise<void> {
  const tokenStatus = await roster.get(`verify.slide.token.${verifyToken}`);
  if (tokenStatus === null || tokenStatus === undefined) {
    throw new Error('验证令牌无效或已过期');
  }
  // 验证通过后立即失效令牌
  await roster.remove(`verify.slide.token.${verifyToken}`);
}

// ============= 算力验证相关 =============

/**
 * 生成算力验证 token
 */
export async function generateProofToken(): Promise<{ token: string; nonce: string; difficulty: number }> {
  const token = randomBytes(20).toString('hex');
  const nonce = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

  await roster.set(`verify.token.${token}`, { nonce, difficulty: DIFFICULTY }, EXPIRE_1H);

  return {
    token,
    nonce,
    difficulty: DIFFICULTY
  };
}

/**
 * 验证算力答案
 */
export function verifyProof(nonce: string, answer: number, difficulty: number): boolean {
  const hash = sha256(`${nonce}${answer}`);
  return hash.startsWith('0'.repeat(difficulty));
}

/**
 * 验证 verify 对象（包含 token, nonce, answer）
 */
export async function verifyProofObject(verify: { token: string; nonce: string; answer: number }): Promise<void> {
  if (!verify || typeof verify !== 'object') {
    throw new Error('Verification is required');
  }
  const { token, nonce, answer } = verify;
  if (!token) {
    throw new Error('Verification token is required');
  }
  if (!nonce) {
    throw new Error('Verification nonce is required');
  }
  if (answer === undefined) {
    throw new Error('Verification answer is required');
  }

  // 立即删除 token，防止重复使用
  const tokenRecord = await roster.getRecordAndRemove(`verify.token.${token}`);
  if (!tokenRecord) {
    throw new Error('Verification token invalid or expired');
  }
  
  const tokenData = tokenRecord.value;
  if (!tokenData || typeof tokenData !== 'object' || !tokenData.nonce) {
    throw new Error('Verification token invalid');
  }

  if (!verifyProof(nonce, answer, tokenData.difficulty || DIFFICULTY)) {
    throw new Error('Verification failed');
  }
}

// ============= 短信/邮箱验证码相关 =============

/**
 * 验证码发送频率限制
 */
export async function checkSendRate(md5Value: string, type: 'sms' | 'email'): Promise<void> {
  const countKey = `verify.${type}.limit.${md5Value}`;
  const countRecord = await roster.getRecord(countKey);
  const currentCount = countRecord?.value || 0;

  if (currentCount >= MAX_PER_HOUR) {
    throw new Error('1小时内发送次数过多，请稍后再试');
  }

  if (countRecord?.updatedAt) {
    const timeSinceLast = (Date.now() - countRecord.updatedAt.getTime()) / 1000;
    if (timeSinceLast < MIN_INTERVAL_SECONDS) {
      const waitSeconds = Math.ceil(MIN_INTERVAL_SECONDS - timeSinceLast);
      throw new Error(`请${waitSeconds}秒后再试`);
    }
  }

  await roster.set(countKey, currentCount + 1, EXPIRE_1H);
}

/**
 * 保存验证码
 */
export async function saveCode(md5Value: string, code: string, type: 'sms' | 'email', formId?: string): Promise<void> {
  const key = formId ? `verify.${type}.code.${formId}.${md5Value}` : `verify.${type}.code.${md5Value}`;
  await roster.set(key, code, EXPIRE_10M);
}

/**
 * 获取并验证验证码
 */
export async function verifyCode(md5Value: string, userCode: string, type: 'sms' | 'email', formId?: string): Promise<void> {
  const key = formId ? `verify.${type}.code.${formId}.${md5Value}` : `verify.${type}.code.${md5Value}`;
  const storedCode = await roster.get(key);
  
  if (!storedCode) {
    throw new Error('验证码已过期，请重新获取');
  }
  
  if (storedCode !== userCode) {
    throw new Error('验证码错误');
  }
  
  // 删除已使用的验证码
  await roster.remove(key);
}

/**
 * 发送短信验证码（通用方法）
 */
export async function sendSmsCode(phone: string, verifyToken: string): Promise<void> {
  // 验证滑块验证码令牌
  await verifySlideToken(verifyToken);

  const phoneMd5Val = md5(phone);
  
  // 发送频率限制
  await checkSendRate(phoneMd5Val, 'sms');

  const code = generateCode();
  await saveCode(phoneMd5Val, code, 'sms');

  console.log(`[SMS] 向 ${phone} 发送验证码: ${code}`);
}

/**
 * 发送邮箱验证码（通用方法）
 */
export async function sendEmailCode(email: string, verifyToken: string): Promise<void> {
  // 验证滑块验证码令牌
  await verifySlideToken(verifyToken);

  const emailMd5Val = md5(email);
  
  // 发送频率限制
  await checkSendRate(emailMd5Val, 'email');

  const code = generateCode();
  await saveCode(emailMd5Val, code, 'email');

  console.log(`[Email] 向 ${email} 发送验证码: ${code}`);
}
