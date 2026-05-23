import { ObjectId, Db } from 'mongodb';

export interface RpcContext {
  db: Db;
  userId?: ObjectId;
  role?: string;
}

export type RpcHandler = (
  params: Record<string, unknown>,
  ctx: RpcContext
) => Promise<unknown>;

export const formMethods: Map<string, RpcHandler> = new Map();
export const agentMethods: Map<string, RpcHandler> = new Map();
export const adminMethods: Map<string, RpcHandler> = new Map();

function registerMethod(methods: Map<string, RpcHandler>, scope: string, name: string, handler: RpcHandler): void {
  methods.set(name, handler);
  console.log(`RPC ${scope} method registered: ${name}`);
}

export function registerFormMethod(name: string, handler: RpcHandler): void {
  registerMethod(formMethods, 'form', name, handler);
}

export function registerAgentMethod(name: string, handler: RpcHandler): void {
  registerMethod(agentMethods, 'agent', name, handler);
}

export function registerAdminMethod(name: string, handler: RpcHandler): void {
  registerMethod(adminMethods, 'admin', name, handler);
}
