/**
 * Jest Global Setup — starts MongoMemoryServer and stores the URI
 * in a temp file so test workers can read it.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '.mongo-uri');

module.exports = async function globalSetup() {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Store reference for globalTeardown
  globalThis.__MONGO_SERVER__ = mongoServer;

  // Write URI to file for test workers to read
  fs.writeFileSync(URI_FILE, uri);
};
