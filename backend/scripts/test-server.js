// Isolated browser-test server. Never connects to an existing database.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import { readConfig } from '../config/env.js';
import { createApp } from '../app.js';
import { seedCatalog } from '../services/seed.js';
import { models } from '../models/index.js';
import { startAttemptExpiry } from '../services/ai-attempts.js';
import { fixtureQuestions } from '../test/helpers/ai-questions.js';
const mongo = await MongoMemoryServer.create();
await connectDatabase(mongo.getUri()); await Promise.all(models.map(m => m.init()));
await seedCatalog('Browser-test-only-42');
const config = readConfig({ NODE_ENV: 'test', PORT: '4011', FRONTEND_URL: 'http://localhost:3011', CORS_ORIGINS: 'http://localhost:3011', MONGODB_URI: mongo.getUri(), JWT_SECRET: randomBytes(48).toString('hex') });
// Explicit test-only provider injection; server.js never enables this path.
const aiOptions = process.env.LEARNOVA_TEST_AI === '1' ? {
  aiEnv: { GEMINI_API_KEY: 'isolated-test-double' },
  quizGenerator: async ({ questionCount }) => ({ model: 'browser-test-double', questions: fixtureQuestions(questionCount) }),
} : {};
const server = createApp(config, aiOptions).listen(4011, () => console.log('Isolated test API ready on port 4011'));
const stopExpiry = startAttemptExpiry();
async function stop() { stopExpiry(); server.close(); await mongoose.disconnect(); await mongo.stop(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
