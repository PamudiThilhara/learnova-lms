// Isolated browser-test server. Never connects to an existing database.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { readConfig } from '../config/env.js';
import { createApp } from '../app.js';
import { seedCatalog } from '../services/seed.js';
import { models } from '../models/index.js';
const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri()); await Promise.all(models.map(m => m.init()));
await seedCatalog('Browser-test-only-42');
const config = readConfig({ NODE_ENV: 'test', PORT: '4011', FRONTEND_URL: 'http://localhost:3011', CORS_ORIGINS: 'http://localhost:3011', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') });
const server = createApp(config).listen(4011, () => console.log('Isolated test API ready on port 4011'));
async function stop() { server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
