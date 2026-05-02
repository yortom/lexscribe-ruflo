/**
 * Unit/integration tests for DomainExceptionFilter (AUTH-06 / bases transversales)
 * Tests that DomainError subclasses produce correct HTTP status + body shape.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, HttpCode } from '@nestjs/common';
import request from 'supertest';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
} from '../../src/common/errors';
import { DomainExceptionFilter } from '../../src/common/filters/domain-exception.filter';

@Controller('test-errors')
class TestErrorsController {
  @Get('not-found')
  notFound() {
    throw new NotFoundError('expediente', 'abc123');
  }

  @Get('conflict')
  conflict() {
    throw new ConflictError('foo already exists');
  }

  @Get('validation')
  validation() {
    throw new ValidationError('bar is invalid');
  }

  @Get('unauthorized')
  unauthorized() {
    throw new UnauthorizedError('Invalid credentials');
  }
}

describe('DomainExceptionFilter', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TestErrorsController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('NotFoundError → 404 + {code:NOT_FOUND, message}', async () => {
    const res = await request(app.getHttpServer()).get('/test-errors/not-found');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'expediente abc123 not found',
    });
    // No stack, no statusCode, no extra fields
    expect(res.body.stack).toBeUndefined();
    expect(res.body.statusCode).toBeUndefined();
  });

  it('ConflictError → 409 + {code:CONFLICT, message}', async () => {
    const res = await request(app.getHttpServer()).get('/test-errors/conflict');
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'CONFLICT' });
    expect(res.body.stack).toBeUndefined();
  });

  it('ValidationError → 400 + {code:VALIDATION, message}', async () => {
    const res = await request(app.getHttpServer()).get('/test-errors/validation');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION' });
    expect(res.body.stack).toBeUndefined();
  });

  it('UnauthorizedError → 401 + {code:UNAUTHORIZED, message}', async () => {
    const res = await request(app.getHttpServer()).get('/test-errors/unauthorized');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Invalid credentials',
    });
    expect(res.body.stack).toBeUndefined();
  });
});
