import { ObjectId, Db } from 'mongodb';

export interface RpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

export interface RpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: RpcError;
  id?: string | number | null;
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RpcContext {
  db: Db;
  userId?: ObjectId;
  roles?: string[];
}

export type RpcHandler = (
  params: Record<string, unknown>,
  ctx: RpcContext
) => Promise<unknown>;
