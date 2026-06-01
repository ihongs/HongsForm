import { createHmac, timingSafeEqual } from 'node:crypto';

export interface AuthPayload {
  sub: string;
  roles: string[];
  exp: number;
}

const secret = process.env.AUTH_SECRET || 'hongs-form-dev-secret';

function encode(data: unknown): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function sign(data: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createToken(payload: Omit<AuthPayload, 'exp'>, ttlSeconds = 60 * 60 * 24 * 7): string {
  const body: AuthPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const data = encode(body);
  return `${data}.${sign(data)}`;
}

export function verifyToken(token: string): AuthPayload | null {
  const [data, signature] = token.split('.');
  if (!data || !signature) return null;

  const expected = sign(data);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as AuthPayload;
  if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
