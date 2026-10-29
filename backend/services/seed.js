import fs from 'node:fs/promises';
import bcrypt from 'bcrypt';
import { User, Course, Setting } from '../models/index.js';
import { password as passwordSchema } from '../validators/index.js';
export async function seedCatalog(password) {
  passwordSchema.parse(password);
  const catalog = JSON.parse(await fs.readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
  const passwordHash = await bcrypt.hash(password, 12);
  for (const { id, ...data } of catalog.users) {
    // Never overwrite an existing account or password.
    await User.updateOne({ _id: id }, { $setOnInsert: { ...data, passwordHash } }, { upsert: true, runValidators: true });
  }
  for (const { id, instructor, students, ...data } of catalog.courses) {
    await Course.updateOne({ _id: id }, { $setOnInsert: data }, { upsert: true, runValidators: true });
  }
  await Setting.updateOne({ _id: 'platform' }, { $setOnInsert: { notifications: true, weeklyDigest: true } }, { upsert: true });
}
