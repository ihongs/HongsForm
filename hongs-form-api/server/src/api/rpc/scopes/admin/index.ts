import { createRpcHandler } from '../../core/handler.js';
import { adminRegistry } from './registry.js';

import './methods/auth.js';
import './methods/users.js';
import './methods/forms.js';
import './methods/formRecords.js';
import './methods/test.js';
import './methods/mineApiKeys.js';
import './methods/mine.js';

export const handleAdminRpc = createRpcHandler(adminRegistry, {
  requireAdmin: true,
  publicMethods: new Set(['login'])
});
