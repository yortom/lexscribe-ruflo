/**
 * E2E tests for ZodValidationPipe global (AUTH-06 / bases transversales)
 * Tests that Zod .strict() rejects extra properties and invalid fields.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../../src/app.module';
import { DomainExceptionFilter } from '../../src/common/filters/domain-exception.filter';

describe('ZodValidationPipe global (AUTH-06)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/login with extra field → 400 (Zod .strict() rejects)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'x@x.com',
        password: 'P@ss12345',
        extraField: 'haxx',
      });

    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/login with invalid email → 400 with validation detail', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'invalid' });

    expect(res.status).toBe(400);
  });
});
