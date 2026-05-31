import { createRpcHandler } from '../../core/handler.js';
import { adminRegistry } from './registry.js';

import './methods/auth.js';
import './methods/user.js';
import './methods/form.js';
import './methods/formRecord.js';
import './methods/mine.js';
import './methods/mineApiKey.js';

export const handleAdminRpc = createRpcHandler(adminRegistry, {
  requireAdmin: true,
  publicMethods: new Set(['login'])
});