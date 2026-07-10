/**
 * Per-file test setup — each test file creates its own MongoMemoryServer.
 * This avoids cross-context issues with Jest globalSetup and is fully
 * self-contained. The --runInBand flag ensures sequential execution.
 *
 * Usage: require('./setup') at the top of each .test.js file.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000); // 60s timeout for first-time binary download

afterAll(async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  // Clean all collections between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
