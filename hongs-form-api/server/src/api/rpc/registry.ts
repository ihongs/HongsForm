import { ObjectId, Db } from 'mongodb';

export type RpcHandler = (
  params: Record<string, unknown>,
  ctx: { db: Db; userId?: ObjectId }
) => Promise<unknown>;

export const methods: Map<string, RpcHandler> = new Map();

export function registerMethod(name: string, handler: RpcHandler): void {
  methods.set(name, handler);
  console.log(`RPC method registered: ${name}`);
}
