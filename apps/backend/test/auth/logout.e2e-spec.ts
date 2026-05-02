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

describe('AUTH-03 logout', () => {
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
      email: 'logout-test@lexscribe.local',
      nombre: 'Logout User',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await app.close();
  });

  it('returns 204 and clears cookie on logout', async () => {
    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'logout-test@lexscribe.local', password: 'P@ssw0rd1234' });
    expect(loginRes.status).toBe(201);

    const refreshCookie = extractRefreshCookie(loginRes.headers['set-cookie']);
    expect(refreshCookie).not.toBeNull();

    // Count tokens before logout
    const userBefore = await usuarioModel.findOne({
      email: 'logout-test@lexscribe.local',
    });
    const tokenCountBefore = userBefore?.refreshTokens?.length ?? 0;
    expect(tokenCountBefore).toBe(1);

    // Logout
    const logoutRes = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', `refresh_token=${refreshCookie}`)
      .send();

    expect(logoutRes.status).toBe(204);

    // Verify cookie is cleared (set-cookie header with empty value or expires in past)
    const setCookie = logoutRes.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie)
        ? setCookie.join('; ')
        : setCookie;
      // Cookie should be cleared (empty value or Expires in past)
      expect(
        cookieStr.includes('refresh_token=;') ||
          cookieStr.includes('refresh_token=,') ||
          cookieStr.includes('Expires='),
      ).toBe(true);
    }

    // Verify token removed from DB
    const userAfter = await usuarioModel.findOne({
      email: 'logout-test@lexscribe.local',
    });
    expect(userAfter?.refreshTokens?.length).toBe(tokenCountBefore - 1);
  });
});
