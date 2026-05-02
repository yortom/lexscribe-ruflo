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

describe('AUTH-04 guards', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let validAccessToken: string;

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

    const passwordHash = await argon2.hash('P@ssw0rd1234', {
      type: argon2.argon2id,
    });
    await usuarioModel.create({
      email: 'guards-test@lexscribe.local',
      nombre: 'Guards User',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });

    // Login to get a valid access token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'guards-test@lexscribe.local',
        password: 'P@ssw0rd1234',
      });
    validAccessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await app.close();
  });

  it('returns 401 on GET /api/v1/usuarios/me without Bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/usuarios/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user data on GET /api/v1/usuarios/me with valid Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .set('Authorization', `Bearer ${validAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      email: 'guards-test@lexscribe.local',
    });
    // usuarioId should NOT be in the body (it's derived from JWT, not body)
    expect(res.body.usuarioId).toBeUndefined();
  });

  it('returns 401 with an invalid/expired Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/usuarios/me')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
  });
});
