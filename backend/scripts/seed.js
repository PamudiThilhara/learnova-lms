import mongoose from 'mongoose';
import { readConfig } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { seedCatalog } from '../services/seed.js';
try {
  const config = readConfig();
  if (config.NODE_ENV === 'production') throw new Error('Development seed is disabled in production.');
  await connectDatabase(config.MONGODB_URI); await seedCatalog(process.env.SEED_PASSWORD);
  console.log('Missing sample accounts and courses created. Password supplied by SEED_PASSWORD.');
} catch (error) { console.error(`Seed failed (${error.name}). Check environment configuration and SEED_PASSWORD.`); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
