import path from 'node:path';
import dotenv from 'dotenv';

// Load env from repo root .env (../../.env relative to apps/api)
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });