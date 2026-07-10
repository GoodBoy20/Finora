/**
 * Jest Global Teardown — stops MongoMemoryServer and cleans up temp file.
 */
const fs = require('fs');
const path = require('path');

const URI_FILE = path.join(__dirname, '.mongo-uri');

module.exports = async function globalTeardown() {
  if (globalThis.__MONGO_SERVER__) {
    await globalThis.__MONGO_SERVER__.stop();
  }
  // Clean up URI file
  if (fs.existsSync(URI_FILE)) {
    fs.unlinkSync(URI_FILE);
  }
};
