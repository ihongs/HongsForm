import { registerAgentMethod } from '../registry.js';
import { 
  login, 
  sendEmailVerificationCode, 
  sendSmsVerificationCode, 
  loginOrRegisterByEmail, 
  loginOrRegisterByPhone,
  generateCaptchaOrdeal,
  verifyCaptcha
} from '../../../shared/users.js';

registerAgentMethod('login', async (params, ctx) => login(params, 'agent', ctx));
registerAgentMethod('sendEmailVerificationCode', async (params, ctx) => sendEmailVerificationCode(params, ctx));
registerAgentMethod('sendSmsVerificationCode', async (params, ctx) => sendSmsVerificationCode(params, ctx));
registerAgentMethod('loginOrRegisterByEmail', async (params, ctx) => loginOrRegisterByEmail(params, ctx));
registerAgentMethod('loginOrRegisterByPhone', async (params, ctx) => loginOrRegisterByPhone(params, ctx));
registerAgentMethod('generateCaptchaOrdeal', async () => generateCaptchaOrdeal());
registerAgentMethod('verifyCaptcha', async (params) => verifyCaptcha(params));
