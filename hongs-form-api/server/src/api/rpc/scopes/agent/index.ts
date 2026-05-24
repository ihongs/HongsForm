import { createRpcHandler } from '../../core/handler.js';
import { agentRegistry } from './registry.js';

import './methods/auth.js';
import './methods/forms.js';
import './methods/formData.js';

export const handleAgentRpc = createRpcHandler(agentRegistry, {
  requireAuth: true,
  publicMethods: new Set([
    'login',
    'sendEmailVerificationCode',
    'sendSmsVerificationCode',
    'loginOrRegisterByEmail',
    'loginOrRegisterByPhone',
    'generateCaptchaOrdeal',
    'verifyCaptcha'
  ])
});
