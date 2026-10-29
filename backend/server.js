import mongoose from 'mongoose';
import { readConfig } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { models } from './models/index.js';
import { createApp } from './app.js';
import { describeStartupError } from './config/startup-errors.js';

let shuttingDown = false;
mongoose.connection.on('error', error => console.error(`MongoDB: ${describeStartupError(error)}`));
mongoose.connection.on('disconnected', () => {
  if (!shuttingDown) console.error('MongoDB disconnected. /api/health will return 503 until the connection recovers.');
});
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected.'));

try {
  const config = readConfig();
  await connectDatabase(config.MONGODB_URI);
  await Promise.all(models.map(m => m.init()));
  const server = createApp(config).listen(config.PORT);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  console.log(`Learnova API listening on http://localhost:${config.PORT}; MongoDB connected (database: ${mongoose.connection.name})`);
  server.on('error', error => console.error(`Backend: ${describeStartupError(error)}`));
  const shutdown = () => { shuttingDown = true; server.close(async () => { await mongoose.disconnect(); process.exit(0); }); setTimeout(() => process.exit(1), 10000).unref(); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
} catch (error) {
  shuttingDown = true;
  console.error(`Backend startup failed: ${describeStartupError(error)}`);
  await mongoose.disconnect(); process.exitCode = 1;
}
