import { createRpcHandler } from '../../core/handler.js';
import { agentRegistry } from './registry.js';

import './methods/auth.js';
import './methods/forms.js';
import './methods/formRecords.js';
import './methods/mineApiKeys.js';
import './methods/mine.js';

export const handleAgentRpc = createRpcHandler(agentRegistry, {
  requireAuth: true,
  publicMethods: new Set([
    'login',
    'loginOrRegisterByEmail',
    'loginOrRegisterByPhone'
  ])
});
