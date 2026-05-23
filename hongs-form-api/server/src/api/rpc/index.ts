import { IncomingMessage, ServerResponse } from 'node:http';
import { ObjectId } from 'mongodb';
import { getDb } from '../../utils/db.js';
import { verifyToken } from '../../utils/auth.js';
import { adminMethods, agentMethods, formMethods, RpcContext, RpcHandler } from './registry.js';

const isDev = process.env.NODE_ENV === 'development';

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

interface RpcHandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  publicMethods?: Set<string>;
}

async function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendResponse(res: ServerResponse, response: RpcResponse, statusCode = 200): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(response));
}

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

async function getAuthContext(req: IncomingMessage): Promise<Pick<RpcContext, 'userId' | 'role'> | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;

  const sk = authorization.slice(7);
  const payload = verifyToken(sk);
  if (payload && ObjectId.isValid(payload.sub)) {
    return {
      userId: new ObjectId(payload.sub),
      role: payload.role
    };
  }

  const userAuth = await getDb().collection('userAuth').findOne({
    sk,
    deletedAt: null,
    expiresAt: { $gt: new Date() }
  });
  if (!userAuth) return null;

  return {
    userId: userAuth.userId,
    role: userAuth.role
  };
}

function buildErrorData(err: unknown): unknown {
  let errorData: any;

  if (err instanceof Error && typeof (err as any).toMap === 'function') {
    errorData = { errors: (err as any).toMap() };
  } else if (err instanceof Error && (err as any).errors) {
    errorData = { errors: (err as any).errors };
  }

  if (isDev && err instanceof Error && err.stack) {
    if (errorData) {
      errorData.stack = err.stack;
    } else {
      errorData = { stack: err.stack };
    }
    console.error(err.stack);
  } else if (err instanceof Error) {
    console.error(err.stack);
  }

  return errorData;
}

function createRpcHandler(methods: Map<string, RpcHandler>, options: RpcHandlerOptions = {}) {
  return async function handleScopedRpc(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = await parseBody(req);
      const request = JSON.parse(body) as RpcRequest;

      if (request.jsonrpc !== '2.0') {
        sendError(res, -32600, 'Invalid Request: jsonrpc must be "2.0"', request.id);
        return;
      }

      if (typeof request.method !== 'string') {
        sendError(res, -32600, 'Invalid Request: method must be a string', request.id);
        return;
      }

      const handler = methods.get(request.method);
      if (!handler) {
        sendError(res, -32601, `Method not found: ${request.method}`, request.id);
        return;
      }

      const isPublicMethod = options.publicMethods?.has(request.method) ?? false;
      const auth = await getAuthContext(req);
      if (req.headers.authorization && !auth) {
        sendError(res, -32001, 'Unauthorized', request.id);
        return;
      }
      if ((options.requireAuth || options.requireAdmin) && !isPublicMethod && !auth) {
        sendError(res, -32001, 'Unauthorized', request.id);
        return;
      }
      if (options.requireAdmin && !isPublicMethod && auth?.role !== 'admin') {
        sendError(res, -32003, 'Forbidden', request.id);
        return;
      }

      const db = getDb();
      const params = request.params || {};

      try {
        const result = await handler(params, { db, ...auth });

        if (request.id !== undefined && request.id !== null) {
          sendResponse(res, {
            jsonrpc: '2.0',
            result,
            id: request.id
          });
        } else {
          res.statusCode = 204;
          res.end();
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Internal error';
        sendError(res, -32000, errorMessage, request.id, buildErrorData(err));
      }
    } catch {
      sendError(res, -32700, 'Parse error');
    }
  };
}

export const handleFormRpc = createRpcHandler(formMethods);
export const handleRpc = handleFormRpc;
export const handleAgentRpc = createRpcHandler(agentMethods, {
  requireAuth: true,
  publicMethods: new Set(['agent.login'])
});
export const handleAdminRpc = createRpcHandler(adminMethods, {
  requireAdmin: true,
  publicMethods: new Set(['admin.login'])
});

import './methods/user.js';
import './methods/form.js';
import './methods/formData.js';
import './methods/test.js';
