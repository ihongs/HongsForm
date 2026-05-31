import { registerAgentMethod } from '../registry.js';
import {
  login,
  loginByEmail,
  loginByPhone,
  registerByEmail,
  registerByPhone
} from '../../../shared/users.js';

registerAgentMethod('login', async (params, ctx) => login(params, 'agent', ctx));
registerAgentMethod('loginByEmail', async (params, ctx) => loginByEmail(params, ctx));
registerAgentMethod('loginByPhone', async (params, ctx) => loginByPhone(params, ctx));
registerAgentMethod('registerByEmail', async (params, ctx) => registerByEmail(params, ctx));
registerAgentMethod('registerByPhone', async (params, ctx) => registerByPhone(params, ctx));
