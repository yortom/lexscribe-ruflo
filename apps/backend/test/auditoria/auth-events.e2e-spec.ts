/**
 * auth-events.e2e-spec.ts
 * E2E tests: login/logout produce audit records in `auditoria` (AUTH-07)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { ZodValidationPipe } from 'nestjs-zod';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

describe('Auth events → auditoria (AUTH-07)', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let auditoriaModel: Model<Auditoria>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();

    usuarioModel = moduleRef.get<Model<any>>(getModelToken(Usuario.name));
    auditoriaModel = moduleRef.get<Model<Auditoria>>(getModelToken(Auditoria.name));

    // Seed test user
    const passwordHash = await argon2.hash('P@ssw0rd1234', { type: argon2.argon2id });
    await usuarioModel.deleteMany({});
    await usuarioModel.create({
      email: 'abogado@despacho.es',
      passwordHash,
      nombre: 'Test User',
      activo: true,
      refreshTokens: [],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await auditoriaModel.deleteMany({});
  });

  it('login produces auth.login audit record', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'abogado@despacho.es', password: 'P@ssw0rd1234' })
      .expect(201);

    // Wait for event + setImmediate chain to flush
    await new Promise<void>((r) => setTimeout(r, 100));

    const records = await auditoriaModel.find().lean();
    expect(records.length).toBeGreaterThanOrEqual(1);
    const loginRecord = records.find((r) => r.accion === 'login');
    expect(loginRecord).toBeDefined();
    expect(loginRecord!.recurso).toBe('usuario');
    expect(loginRecord!.usuarioId).toBeTruthy();
  });

  it('logout produces auth.logout audit record', async () => {
    // Login first to get a cookie
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'abogado@despacho.es', password: 'P@ssw0rd1234' });

    const cookie = loginRes.headers['set-cookie'] as unknown as string[];
    await auditoriaModel.deleteMany({});

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    await new Promise<void>((r) => setTimeout(r, 100));

    const records = await auditoriaModel.find().lean();
    expect(records.length).toBeGreaterThanOrEqual(1);
    const logoutRecord = records.find((r) => r.accion === 'logout');
    expect(logoutRecord).toBeDefined();
    expect(logoutRecord!.recurso).toBe('usuario');
  });
});
