/* eslint-disable @typescript-eslint/no-explicit-any */
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as mongoose from 'mongoose';

// We import runSeed from the script, avoiding process.exit
import { runSeed } from '../../scripts/seed';

// Minimal Mongoose schemas for direct DB verification
const UsuarioSchema = new mongoose.Schema({
  email: String,
  nombre: String,
  rol: String,
  passwordHash: String,
  refreshTokens: Array,
});

const EsquemaSchema = new mongoose.Schema({
  usuarioId: mongoose.Schema.Types.ObjectId,
  tipoObjeto: String,
  parametros: Array,
});

describe('AUTH-05 seed (idempotent)', () => {
  let mongo: MongoMemoryServer;
  let connection: mongoose.Connection;
  let UsuarioModel: mongoose.Model<any>;
  let EsquemaModel: mongoose.Model<any>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();

    // Override MONGO_URI for the seed's NestFactory bootstrap
    process.env.MONGO_URI = uri;
    process.env.JWT_ACCESS_SECRET = 'test-secret-32-chars-minimum-aaaa';
    process.env.NODE_ENV = 'test';
    process.env.SEED_USER_EMAIL = 'seed-test@lexscribe.local';
    process.env.SEED_USER_PASSWORD = 'SeedP@ss1234';

    // Open a separate connection for assertions
    connection = await mongoose.createConnection(uri).asPromise();
    UsuarioModel = connection.model('usuarios', UsuarioSchema);
    EsquemaModel = connection.model('esquemas', EsquemaSchema);
  });

  afterAll(async () => {
    await connection.close();
    await mongo.stop();
    delete process.env.SEED_USER_EMAIL;
    delete process.env.SEED_USER_PASSWORD;
  });

  it('Test 1 (creation): creates 1 user and 2 esquemas with empty parametros', async () => {
    await runSeed();

    const users = await UsuarioModel.find({});
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('seed-test@lexscribe.local');

    const esquemas = await EsquemaModel.find({});
    expect(esquemas).toHaveLength(2);
    expect(esquemas.every((e: any) => Array.isArray(e.parametros) && e.parametros.length === 0)).toBe(true);
  });

  it('Test 2 (idempotency): second runSeed does not duplicate user or esquemas', async () => {
    await runSeed();

    const users = await UsuarioModel.find({});
    expect(users).toHaveLength(1);

    const esquemas = await EsquemaModel.find({});
    expect(esquemas).toHaveLength(2);
  });

  it('Test 3 (no overwrite password): password hash unchanged after re-seed with different password', async () => {
    const userBefore = await UsuarioModel.findOne({});
    const originalHash: string = userBefore!.passwordHash;

    // Change the env password and re-run seed
    process.env.SEED_USER_PASSWORD = 'DifferentP@ss5678';
    await runSeed();

    const userAfter = await UsuarioModel.findOne({});
    expect(userAfter!.passwordHash).toBe(originalHash);

    // Restore
    process.env.SEED_USER_PASSWORD = 'SeedP@ss1234';
  });

  it('Test 4 (env missing): runSeed throws when SEED_USER_EMAIL is absent', async () => {
    const savedEmail = process.env.SEED_USER_EMAIL;
    delete process.env.SEED_USER_EMAIL;

    await expect(runSeed()).rejects.toThrow(
      'SEED_USER_EMAIL and SEED_USER_PASSWORD are required',
    );

    process.env.SEED_USER_EMAIL = savedEmail;
  });
});
