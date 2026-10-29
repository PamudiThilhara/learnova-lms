import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDatabase, validateDatabaseUri } from '../config/database.js';
import { describeStartupError } from '../config/startup-errors.js';
import { verifyDatabase } from '../services/verify-database.js';

let mongo;
before(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDatabase(mongo.getUri('unrelated_database'));
}, { timeout: 180000 });
after(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

test('a copied URI cannot redirect Learnova writes to another database', async () => {
  assert.equal(mongoose.connection.name, 'learnova');
  const unrelated = mongoose.connection.getClient().db('unrelated_database');
  await unrelated.collection('existing').insertOne({ _id: 'preserve-me', value: 'unchanged' });
  const sentinel = mongoose.connection.db.collection('existing');
  await sentinel.insertOne({ _id: 'preserve-me', value: 'unchanged' });
  const before = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name).sort();
  await verifyDatabase(mongoose.connection.db);
  assert.deepEqual((await mongoose.connection.db.listCollections().toArray()).map(c => c.name).sort(), before);
  assert.equal((await sentinel.findOne({ _id: 'preserve-me' })).value, 'unchanged');
  assert.equal((await unrelated.collection('existing').findOne({ _id: 'preserve-me' })).value, 'unchanged');
  await assert.rejects(verifyDatabase(unrelated), /Verification only runs against learnova/);
});

test('temporary verification collection is removed even if the read fails', async () => {
  const db = mongoose.connection.db;
  const before = (await db.listCollections().toArray()).map(c => c.name).sort();
  const wrapped = {
    databaseName: db.databaseName,
    command: (...args) => db.command(...args),
    async createCollection(...args) {
      const collection = await db.createCollection(...args);
      return {
        insertOne: (...params) => collection.insertOne(...params),
        findOne: async () => { throw new Error('Simulated read failure'); },
        drop: (...params) => collection.drop(...params),
      };
    },
  };
  await assert.rejects(verifyDatabase(wrapped), /Simulated read failure/);
  assert.deepEqual((await db.listCollections().toArray()).map(c => c.name).sort(), before);
});

test('missing credentials fail locally and diagnostics never echo sensitive error text', () => {
  for (const uri of ['mongodb+srv://user:<db_password>@cluster.example.mongodb.net/learnova', 'mongodb+srv://user:@cluster.example.mongodb.net/learnova']) {
    assert.throws(() => validateDatabaseUri(uri), { code: 'MONGODB_PASSWORD_MISSING' });
  }
  assert.throws(() => validateDatabaseUri('mongodb+srv://cluster.example.mongodb.net/learnova'), { code: 'MONGODB_URI_MISSING' });
  const secret = 'sensitive-value-that-must-stay-private';
  const examples = [
    [{ code: 18, message: `Authentication failed ${secret}` }, /authentication failed/i],
    [{ code: 13, message: `not authorized ${secret}` }, /readWrite/],
    [{ name: 'MongoServerError', code: 8000, codeName: 'AtlasError', message: `user is not allowed to do action [createCollection] on [learnova.example] ${secret}` }, /Collection field completely empty/],
    [{ code: 8000, codeName: 'AtlasError', message: `bad auth : authentication failed ${secret}` }, /authentication failed/i],
    [{ cause: { errorResponse: { code: 8000, errmsg: `user is not allowed to do action [createIndex] ${secret}` } } }, /Remove any literal "Leave blank"/],
    [{ name: 'MongoServerSelectionError', reason: { servers: new Map([['host', { error: { code: 18, message: secret } }]]) } }, /authentication failed/i],
    [{ name: 'MongoNetworkError', message: secret }, /Network Access/],
    [{ code: 'ENOTFOUND', message: `querySrv ENOTFOUND ${secret}` }, /DNS lookup failed/],
    [{ code: 'ETIMEOUT', syscall: 'querySrv', message: secret }, /DNS lookup failed/],
    [{ code: 'ECONNREFUSED', syscall: 'queryTxt', message: secret }, /DNS lookup failed/],
    [{ code: 'ESERVFAIL', message: secret }, /DNS lookup failed/],
    [{ code: 'ERR_TLS_CERT_ALTNAME_INVALID', message: secret }, /certificate validation enabled/],
    [{ code: 'EADDRINUSE', message: secret }, /port is already in use/],
    [{ name: 'UnknownError', message: secret }, /omitted/],
  ];
  for (const [error, expected] of examples) {
    const result = describeStartupError(error);
    assert.match(result, expected);
    assert(!result.includes(secret));
  }
});
