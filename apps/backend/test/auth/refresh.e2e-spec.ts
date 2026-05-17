/* eslint-disable @typescript-eslint/no-explicit-any */
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

function extractRefreshCookie(
  setCookieHeader: string | string[] | undefined,
): string | null {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];
  for (const c of cookies) {
    const match = c.match(/refresh_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}

describe('AUTH-02 refresh', () => {
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

    const passwordHash = await argon2.hash('P@ssw0rd1234', {
      type: argon2.argon2id,
    });
    await usuarioModel.create({
      email: 'refresh-test@lexscribe.local',
      nombre: 'Refresh User',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
  });

  beforeEach(async () => {
    // Clean refresh tokens between tests to ensure isolation
    await usuarioModel.updateMany({}, { $set: { refreshTokens: [] } });
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await app.close();
  });

  it('rotates cookie on valid refresh and returns new accessToken', async () => {
    // Login first
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'refresh-test@lexscribe.local',
        password: 'P@ssw0rd1234',
      });
    expect(loginRes.status).toBe(201);

    const originalCookie = extractRefreshCookie(
      loginRes.headers['set-cookie'],
    );
    expect(originalCookie).not.toBeNull();

    // Use refresh cookie to get new tokens
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${originalCookie}`)
      .send();

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();
    expect(refreshRes.body.expiresIn).toBe(900);

    const newCookie = extractRefreshCookie(refreshRes.headers['set-cookie']);
    expect(newCookie).not.toBeNull();
    expect(newCookie).not.toBe(originalCookie);
  });

  it('returns 401 and clears all tokens when reusing a rotated cookie', async () => {
    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'refresh-test@lexscribe.local',
        password: 'P@ssw0rd1234',
      });
    const originalCookie = extractRefreshCookie(loginRes.headers['set-cookie']);
    expect(originalCookie).not.toBeNull();

    // First refresh — rotates the token (now user has 1 new token)
    const firstRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${originalCookie}`)
      .send();
    expect(firstRefresh.status).toBe(200);

    // Add the new cookie to second refresh and then reuse original
    const newCookie = extractRefreshCookie(firstRefresh.headers['set-cookie']);
    expect(newCookie).not.toBeNull();
    expect(newCookie).not.toBe(originalCookie);

    // Second refresh with the new cookie — should succeed first to consume it
    // Then attempt to reuse the new cookie (simulating reuse detection)
    const secondRefresh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${newCookie}`)
      .send();
    expect(secondRefresh.status).toBe(200);

    // Now reuse the old newCookie (already rotated) — reuse detection
    const reuseRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refresh_token=${newCookie}`)
      .send();
    expect(reuseRes.status).toBe(401);

    // Verify all refresh tokens cleared (clearAllRefreshTokens called)
    const user = await usuarioModel.findOne({
      email: 'refresh-test@lexscribe.local',
    });
    expect(user?.refreshTokens).toHaveLength(0);
  });
});
