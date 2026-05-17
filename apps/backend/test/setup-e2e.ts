import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongo.getUri();
  process.env.JWT_ACCESS_SECRET = 'test-secret-32-chars-minimum-aaaa';
  process.env.APP_ENCRYPTION_KEY = 'test-pii-secret-32-chars-minimum';
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  await mongo?.stop();
});
