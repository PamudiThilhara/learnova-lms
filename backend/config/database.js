import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

export const DATABASE_NAME = 'learnova';

export function validateDatabaseUri(uri) {
  if (typeof uri !== 'string' || !/^mongodb(?:\+srv)?:\/\//.test(uri)) {
    throw Object.assign(new Error('Set MONGODB_URI in backend/.env.'), { code: 'MONGODB_URI_MISSING' });
  }
  const authority = uri.slice(uri.indexOf('://') + 3).split('/')[0];
  const credentials = authority.includes('@') ? authority.slice(0, authority.lastIndexOf('@')) : '';
  if (/<(?:db_)?password>|YOUR_PASSWORD/i.test(uri) || (credentials.includes(':') && !credentials.slice(credentials.indexOf(':') + 1))) {
    throw Object.assign(new Error('Replace the password placeholder in backend/.env.'), { code: 'MONGODB_PASSWORD_MISSING' });
  }
  if (/<[^>]+>/.test(uri) || (/\.mongodb\.net(?::\d+)?(?:,|$)/i.test(authority) && !credentials)) {
    throw Object.assign(new Error('Complete the Atlas credentials in backend/.env.'), { code: 'MONGODB_URI_MISSING' });
  }
}

export async function connectDatabase(uri) {
  validateDatabaseUri(uri);
  // Always select Learnova's database, even if a copied URI names another database.
  await mongoose.connect(uri, { dbName: DATABASE_NAME, serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(mongoose.models).map(async model => {
    await model.createCollection();
    await model.createIndexes();
  }));
}
