import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Model } from 'mongoose';
import { DomainExceptionFilter } from '../../src/common/filters/domain-exception.filter';

describe('AUTH-01 login', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new DomainExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    usuarioModel = moduleRef.get<Model<any>>(getModelToken(Usuario.name));

    // Create seed user
    const passwordHash = await argon2.hash('P@ssw0rd1234', {
      type: argon2.argon2id,
    });
    await usuarioModel.create({
      email: 'test@lexscribe.local',
      nombre: 'Test User',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await app.close();
  });

  it('returns 200 with accessToken and cookie on valid credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@lexscribe.local', password: 'P@ssw0rd1234' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      accessToken: expect.any(String),
      expiresIn: 900,
      user: {
        id: expect.any(String),
        email: 'test@lexscribe.local',
        nombre: 'Test User',
      },
    });

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie)
      ? setCookie.join('; ')
      : setCookie;
    expect(cookieStr).toMatch(/refresh_token=/);
    expect(cookieStr).toMatch(/HttpOnly/i);
    expect(cookieStr).toMatch(/SameSite=Strict/i);
    expect(cookieStr).toMatch(/Path=\/api\/v1\/auth/i);
    expect(cookieStr).toMatch(/Max-Age=604800/i);
  });

  it('returns 401 on invalid credentials (wrong password)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@lexscribe.local', password: 'WrongPassword1' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 on invalid credentials (unknown user)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'unknown@lexscribe.local', password: 'P@ssw0rd1234' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 400 when body has extra field usuarioId (Zod .strict())', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@lexscribe.local',
        password: 'P@ssw0rd1234',
        usuarioId: 'injected-id',
      });

    expect(res.status).toBe(400);
  });
});
