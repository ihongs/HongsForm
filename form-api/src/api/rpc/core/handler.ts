import { IncomingMessage, ServerResponse } from 'node:http';
import { ObjectId } from 'mongodb';
import { ZodError } from 'zod';
import { getDb } from '../../../utils/db.js';
import { verifyToken } from '../../../utils/auth.js';
import { RpcContext, RpcHandler, RpcRequest, RpcResponse } from './types.js';
import { RpcMethodRegistry } from './registry.js';

const isDev = process.env.NODE_ENV === 'development';

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
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
  if (!userAuth) return null;

  return {
    userId: userAuth.userId,
    role: userAuth.role
  };
}

function buildErrorData(err: unknown): unknown {
  if (err instanceof ZodError) {
    return {
      errors: err.issues.map(issue => {
        const result: Record<string, unknown> = {
          path: issue.path,
          message: issue.message,
          code: issue.code,
        };

        const params: Record<string, unknown> = {};

        if (issue.code === 'invalid_type') {
          const i = issue as { expected?: string; received?: string };
          if (i.expected) params.expected = i.expected;
          if (i.received) params.received = i.received;
        } else if (issue.code === 'too_small' || issue.code === 'too_big') {
          const i = issue as { minimum?: number; maximum?: number; type?: string; inclusive?: boolean };
          if (i.minimum !== undefined) params.minimum = i.minimum;
          if (i.maximum !== undefined) params.maximum = i.maximum;
          if (i.type) params.type = i.type;
          if (i.inclusive !== undefined) params.inclusive = i.inclusive;
        } else if (issue.code === 'invalid_format') {
          const i = issue as { format?: string };
          if (i.format) params.format = i.format;
        } else if (issue.code === 'not_multiple_of') {
          const i = issue as { multipleOf?: number };
          if (i.multipleOf) params.multipleOf = i.multipleOf;
        }

        if (Object.keys(params).length > 0) {
          result.params = params;
        }

        return result;
      })
    };
  }

  let errorData: any;
  if (typeof (err as any).getErrors === 'function') {
    errorData = { errors: (err as any).getErrors() };
  } else if ((err as any).errors) {
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

export function createRpcHandler(registry: RpcMethodRegistry, options: RpcHandlerOptions = {}) {
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

      const handler: RpcHandler | undefined = registry.methods.get(request.method);
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
        let errorMessage: string;
        if (err instanceof ZodError) {
          errorMessage = 'ZodError';
        } else if (err instanceof Error) {
          errorMessage = err.message;
        } else {
          errorMessage = 'Internal error';
        }
        sendError(res, -32000, errorMessage, request.id, buildErrorData(err));
      }
    } catch {
      sendError(res, -32700, 'Parse error');
    }
  };
}