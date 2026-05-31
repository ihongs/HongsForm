import { registerAdminMethod } from '../registry.js';
import { login } from '../../../shared/users.js';

registerAdminMethod('login', async (params, ctx) => login(params, 'admin', ctx));
