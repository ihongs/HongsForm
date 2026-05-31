import { registerAgentMethod } from '../registry.js';
import { 
  login, 
  loginOrRegisterByEmail, 
  loginOrRegisterByPhone
} from '../../../shared/users.js';

registerAgentMethod('login', async (params, ctx) => login(params, 'agent', ctx));
registerAgentMethod('loginOrRegisterByEmail', async (params, ctx) => loginOrRegisterByEmail(params, ctx));
registerAgentMethod('loginOrRegisterByPhone', async (params, ctx) => loginOrRegisterByPhone(params, ctx));
