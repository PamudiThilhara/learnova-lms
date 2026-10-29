import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { DATABASE_NAME } from '../config/database.js';

export async function verifyDatabase(db) {
  assert.equal(db.databaseName, DATABASE_NAME, 'Verification only runs against learnova.');
  await db.command({ ping: 1 }, { timeoutMS: 10000 });
  const name = `_learnova_connection_check_${randomBytes(12).toString('hex')}`;
  // Explicit creation must succeed before cleanup can drop this unique test collection.
  const collection = await db.createCollection(name, { timeoutMS: 10000 });
  try {
    const document = { _id: randomUUID(), marker: randomUUID(), createdAt: new Date() };
    await collection.insertOne(document, { timeoutMS: 10000 });
    const stored = await collection.findOne({ _id: document._id }, { timeoutMS: 10000 });
    assert.equal(stored?.marker, document.marker, 'The temporary document must be readable.');
    const removed = await collection.deleteOne({ _id: document._id, marker: document.marker }, { timeoutMS: 10000 });
    assert.equal(removed.deletedCount, 1, 'Only the temporary document must be deleted.');
  } finally {
    await collection.drop({ timeoutMS: 10000 });
  }
}
