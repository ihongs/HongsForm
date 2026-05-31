import { createRpcHandler } from '../../core/handler.js';
import { commonRegistry } from './registry.js';

import './methods/verify.js';

export const handleCommonRpc = createRpcHandler(commonRegistry, {
  requireAuth: false
});
