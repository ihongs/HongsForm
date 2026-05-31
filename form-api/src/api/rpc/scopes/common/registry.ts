import { createRpcRegistry } from '../../core/registry.js';

export const commonRegistry = createRpcRegistry('common');
export const registerCommonMethod = commonRegistry.register;
