import { createRpcRegistry } from '../../core/registry.js';

export const formRegistry = createRpcRegistry('form');
export const registerFormMethod = formRegistry.register;
