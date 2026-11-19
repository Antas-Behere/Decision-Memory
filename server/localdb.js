const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

(async () => {
  const dbPath = path.join(__dirname, 'data');
  fs.mkdirSync(dbPath, { recursive: true });
  const m = await MongoMemoryServer.create({
    instance: { port: 27017, dbPath, storageEngine: 'wiredTiger' }
  });
  console.log('Local MongoDB running at', m.getUri());
})();