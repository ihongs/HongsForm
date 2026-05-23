import { createRpcRegistry } from '../../core/registry.js';

export const adminRegistry = createRpcRegistry('admin');
export const registerAdminMethod = adminRegistry.register;
