import { createRpcRegistry } from '../../core/registry.js';

export const agentRegistry = createRpcRegistry('agent');
export const registerAgentMethod = agentRegistry.register;
