import { registerCommonMethod } from '../registry.js';
import {
  generateProofToken,
  generateSlideCaptcha,
  verifySlidePosition,
  generateSlideVerifyToken,
  sendSmsCode,
  sendEmailCode
} from '../../../../../utils/verify.js';

registerCommonMethod('verify.generateToken', async () => {
  return await generateProofToken();
});

// 生成滑块验证码
registerCommonMethod('verify.generateSlideCaptcha', async () => {
  return generateSlideCaptcha();
});

// 验证滑块验证码
registerCommonMethod('verify.verifySlideCaptcha', async (params) => {
  const { captchaId, x } = params as any;
  
  if (!captchaId || x === undefined) {
    throw new Error('参数不完整');
  }
  
  const success = await verifySlidePosition(captchaId, x);
  
  if (!success) {
    throw new Error('验证失败，请重试');
  }
  
  // 生成一个验证通过的令牌，用于后续请求
  const verifyToken = await generateSlideVerifyToken();
  
  return {
    success: true,
    verifyToken
  };
});

registerCommonMethod('verify.sendSmsCode', async (params) => {
  const { verifyToken, phone } = params as any;

  if (!verifyToken || !phone) {
    throw new Error('参数不完整');
  }

  await sendSmsCode(phone, verifyToken);

  return {
    success: true,
    message: '验证码发送成功'
  };
});

registerCommonMethod('verify.sendEmailCode', async (params) => {
  const { verifyToken, email } = params as any;

  if (!verifyToken || !email) {
    throw new Error('参数不完整');
  }

  await sendEmailCode(email, verifyToken);

  return {
    success: true,
    message: '验证码发送成功'
  };
});
