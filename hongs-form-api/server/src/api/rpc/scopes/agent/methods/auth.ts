import { registerAgentMethod } from '../registry.js';
import { login } from '../../../shared/users.js';

registerAgentMethod('login', async (params, ctx) => login(params, 'agent', ctx));
