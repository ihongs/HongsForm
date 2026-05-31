import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface EnvConfig {
  PORT?: string;
  MONGODB_URI?: string;
  NODE_ENV?: string;
  [key: string]: string | undefined;
}

export function loadEnv(): EnvConfig {
  const envPath = resolve(process.cwd(), '.env');
  const env: EnvConfig = { ...process.env };

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  }

  return env;
}
