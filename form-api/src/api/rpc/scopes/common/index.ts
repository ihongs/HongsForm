import { createRpcHandler } from '../../core/handler.js';
import { commonRegistry } from './registry.js';

import './methods/verify.js';
import './methods/upload.js';

export const handleCommonRpc = createRpcHandler(commonRegistry, {
  requireAuth: false
});
