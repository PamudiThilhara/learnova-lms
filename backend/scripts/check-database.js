import mongoose from 'mongoose';
import { readConfig } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { describeStartupError } from '../config/startup-errors.js';
import { verifyDatabase } from '../services/verify-database.js';

try {
  const config = readConfig();
  // Do not import application models or seed data during this connection check.
  await connectDatabase(config.MONGODB_URI);
  console.log('MongoDB connection and authentication succeeded (database: learnova). Checking database permissions...');
  await verifyDatabase(mongoose.connection.db);
  console.log('PASS: MongoDB connected to learnova; temporary write, read, delete, and collection cleanup succeeded. Existing records were not changed.');
} catch (error) {
  console.error(`Database check failed: ${describeStartupError(error)}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
