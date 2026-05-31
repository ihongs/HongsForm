import { createRpcHandler } from '../../core/handler.js';
import { agentRegistry } from './registry.js';

import './methods/auth.js';
import './methods/form.js';
import './methods/formRecord.js';
import './methods/mine.js';
import './methods/mineApiKey.js';

export const handleAgentRpc = createRpcHandler(agentRegistry, {
  requireAuth: true,
  publicMethods: new Set([
    'login',
    'loginOrRegisterByEmail',
    'loginOrRegisterByPhone'
  ])
});