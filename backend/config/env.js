import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export function readConfig(env = process.env) {
  const value = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//).min(15),
    JWT_SECRET: z.string().min(32),
    FRONTEND_URL: z.url().default('http://localhost:3000'),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
    TRUST_PROXY: z.enum(['0', '1']).default('0'),
  }).parse(env);
  return { ...value, origins: value.CORS_ORIGINS.split(',').map(s => s.trim()), production: value.NODE_ENV === 'production' };
}
