import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { readConfig } from '../config/env.js';
import { connectDatabase } from '../config/database.js';
import { User } from '../models/index.js';
import { email, password } from '../validators/index.js';
try {
  const config = readConfig(); const address = email.parse(process.env.ADMIN_EMAIL); const secret = password.parse(process.env.ADMIN_PASSWORD);
  await connectDatabase(config.MONGODB_URI);
  if (await User.exists({ email: address })) throw new Error('An account with this email already exists.');
  await User.create({ name: process.env.ADMIN_NAME || 'Learnova Administrator', email: address, passwordHash: await bcrypt.hash(secret, 12), role: 'admin' });
  console.log('Administrator created.');
} catch (error) { console.error(`Administrator creation failed (${error.name}). Check configuration and use an unused email.`); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
