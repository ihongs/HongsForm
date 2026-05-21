import { IncomingMessage, ServerResponse } from 'node:http';
import { ObjectId } from 'mongodb';
import { VError } from 'hongs-form';
import { getDb } from '../utils/db.js';

const isDev = process.env.NODE_ENV === 'development';

// JSON-RPC 2.0 请求接口
export interface RpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

// JSON-RPC 2.0 响应接口
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

// RPC 方法处理器
type RpcHandler = (
  params: Record<string, unknown>,
  ctx: { db: ReturnType<typeof getDb>; userId?: ObjectId }
) => Promise<unknown>;

// 方法注册表
const methods: Map<string, RpcHandler> = new Map();

// 解析请求体
async function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// 发送响应
function sendResponse(res: ServerResponse, response: RpcResponse, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(response));
}

// 发送错误
function sendError(
  res: ServerResponse,
  code: number,
  message: string,
  id?: string | number | null,
  data?: unknown
): void {
  sendResponse(res, {
    jsonrpc: '2.0',
    error: { code, message, data },
    id
  });
}

// RPC 主处理器
export async function handleRpc(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseBody(req);
    const request = JSON.parse(body) as RpcRequest;

    // 验证 JSON-RPC 版本
    if (request.jsonrpc !== '2.0') {
      sendError(res, -32600, 'Invalid Request: jsonrpc must be "2.0"', request.id);
      return;
    }

    // 验证方法
    if (typeof request.method !== 'string') {
      sendError(res, -32600, 'Invalid Request: method must be a string', request.id);
      return;
    }

    // 查找处理器
    const handler = methods.get(request.method);
    if (!handler) {
      sendError(res, -32601, `Method not found: ${request.method}`, request.id);
      return;
    }

    const db = getDb();
    const params = request.params || {};

    try {
      // 执行方法
      const result = await handler(params, { db });

      // 通知（无 id）不需要响应
      if (request.id !== undefined && request.id !== null) {
        sendResponse(res, {
          jsonrpc: '2.0',
          result,
          id: request.id
        });
      }
    } catch (err) {
      // 应用层错误
      const errorMessage = err instanceof Error ? err.message : 'Internal error';
      let errorData: any;

      // 处理表单校验错误，附加字段级错误信息
      if (err instanceof VError) {
        errorData = { errors: err.toMap() };
      } else if (err instanceof Error && (err as any).errors) {
        errorData = { errors: (err as any).errors };
      }

      // 仅开发模式下输出 stack 到响应，生产模式只记录到日志
      if (isDev && err instanceof Error && err.stack) {
        if (errorData) {
          errorData.stack = err.stack;
        } else {
          errorData = { stack: err.stack };
        }
        console.error(err.stack);
      } else if (err instanceof Error) {
        // 生产模式只记录日志，不输出给前端
        console.error(err.stack);
      }

      sendError(res, -32000, errorMessage, request.id, errorData);
    }
  } catch (err) {
    // 解析错误
    sendError(res, -32700, 'Parse error');
  }
}

// 注册 RPC 方法
export function registerMethod(name: string, handler: RpcHandler): void {
  methods.set(name, handler);
  console.log(`RPC method registered: ${name}`);
}

// 导入所有方法注册
import './methods/user.js';
import './methods/form.js';
import './methods/formData.js';
import './methods/test.js';
