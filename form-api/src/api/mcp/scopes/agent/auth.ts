import { IncomingMessage } from 'node:http';
import { ObjectId } from 'mongodb';
import { getDb } from '../../../../utils/db.js';

export interface McpAuthContext {
  userId: ObjectId | null;
  roles: string[] | null;
  authenticated: boolean;
}

export async function verifySkAuth(req: IncomingMessage): Promise<McpAuthContext> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return { userId: null, roles: null, authenticated: false };
  }

  const sk = authorization.slice(7);

  const userAuth = await getDb().collection('userAuth').findOne({
    sk,
    deletedAt: null,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });

  if (!userAuth) {
    return { userId: null, roles: null, authenticated: false };
  }

  const user = await getDb().collection('users').findOne({
    _id: userAuth.userId,
    deletedAt: null
  });

  if (!user) {
    return { userId: null, roles: null, authenticated: false };
  }

  return {
    userId: userAuth.userId,
    roles: user.roles || [],
    authenticated: true
  };
}

export function requireAuth(auth: McpAuthContext): ObjectId {
  if (!auth.authenticated || !auth.userId) {
    throw new Error('Unauthorized: valid Bearer token required');
  }
  return auth.userId;
}
