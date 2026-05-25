import { registerCommonMethod } from '../registry.js';
import { roster } from '../../../../../utils/roster.js';
import { createHash, randomBytes } from 'node:crypto';

const DIFFICULTY = 4;
const MAX_PER_HOUR = 5;
const EXPIRE_1H = 3600;
const EXPIRE_5M = 300;
const MIN_INTERVAL_SECONDS = 55;

// 生成随机验证码
function generateCode(length = 6): string {
  return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}

// 验证算力答案
function verifyProof(nonce: string, answer: number, difficulty: number): boolean {
  const hash = createHash('sha256').update(`${nonce}${answer}`).digest('hex');
  return hash.startsWith('0'.repeat(difficulty));
}

// 生成 MD5 哈希，防止超长 key 攻击
function md5(str: string): string {
  return createHash('md5').update(str).digest('hex');
}

registerCommonMethod('verify.generateToken', async () => {
  const token = randomBytes(20).toString('hex');
  const nonce = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

  await roster.set(`verify.token.${token}`, 0, EXPIRE_1H);

  return {
    token,
    nonce,
    difficulty: DIFFICULTY
  };
});

registerCommonMethod('verify.sendSmsCode', async (params) => {
  const { token, nonce, answer, phone } = params as any;

  if (!token || !nonce || answer === undefined || !phone) {
    throw new Error('参数不完整');
  }

  const tokenStatus = await roster.get(`verify.token.${token}`);
  if (tokenStatus === null || tokenStatus === undefined) {
    throw new Error('token无效或已过期');
  }

  if (tokenStatus === 1) {
    throw new Error('请勿重复发送');
  }

  if (!verifyProof(nonce, answer, DIFFICULTY)) {
    throw new Error('验证失败');
  }

  const phoneMd5 = md5(phone);
  const countKey = `verify.sms.limit.${phoneMd5}`;
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
  await roster.set(`verify.token.${token}`, 1, EXPIRE_1H);

  const code = generateCode();
  await roster.set(`verify.sms.code.${phoneMd5}`, code, EXPIRE_5M);

  // TODO: 这里调用实际的短信发送服务
  console.log(`[SMS] 向 ${phone} 发送验证码: ${code}`);

  return {
    success: true,
    message: '验证码发送成功'
  };
});

registerCommonMethod('verify.sendEmailCode', async (params) => {
  const { token, nonce, answer, email } = params as any;

  if (!token || !nonce || answer === undefined || !email) {
    throw new Error('参数不完整');
  }

  const tokenStatus = await roster.get(`verify.token.${token}`);
  if (tokenStatus === null || tokenStatus === undefined) {
    throw new Error('token无效或已过期');
  }

  if (tokenStatus === 1) {
    throw new Error('请勿重复发送');
  }

  if (!verifyProof(nonce, answer, DIFFICULTY)) {
    throw new Error('验证失败');
  }

  const emailMd5 = md5(email);
  const countKey = `verify.sms.limit.${emailMd5}`;
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
  await roster.set(`verify.token.${token}`, 1, EXPIRE_1H);

  const code = generateCode();
  await roster.set(`verify.email.code.${emailMd5}`, code, EXPIRE_5M);

  // TODO: 这里调用实际的邮件发送服务
  console.log(`[Email] 向 ${email} 发送验证码: ${code}`);

  return {
    success: true,
    message: '验证码发送成功'
  };
});
