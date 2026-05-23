import { createRpcHandler } from '../../core/handler.js';
import { adminRegistry } from './registry.js';

import './methods/auth.js';
import './methods/users.js';
import './methods/forms.js';
import './methods/formData.js';
import './methods/test.js';

export const handleAdminRpc = createRpcHandler(adminRegistry, {
  requireAdmin: true,
  publicMethods: new Set(['login'])
});
