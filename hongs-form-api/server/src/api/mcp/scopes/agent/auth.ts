import { IncomingMessage } from 'node:http';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../utils/db.js';

export interface McpAuthContext {
  userId: ObjectId | null;
  role: string | null;
  authenticated: boolean;
}

export async function verifySkAuth(req: IncomingMessage): Promise<McpAuthContext> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return { userId: null, role: null, authenticated: false };
  }

  const sk = authorization.slice(7);

  const userAuth = await getDb().collection('userAuth').findOne({
    sk,
    deletedAt: null,
    expiresAt: { $gt: new Date() }
  });

  if (!userAuth) {
    return { userId: null, role: null, authenticated: false };
  }

  return {
    userId: userAuth.userId,
    role: userAuth.role,
    authenticated: true
  };
}

export function requireAuth(auth: McpAuthContext): ObjectId {
  if (!auth.authenticated || !auth.userId) {
    throw new Error('Unauthorized: valid Bearer token required');
  }
  return auth.userId;
}
