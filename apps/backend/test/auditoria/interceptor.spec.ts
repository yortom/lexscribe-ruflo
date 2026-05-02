/**
 * interceptor.spec.ts
 * Unit/integration tests for AuditInterceptor + @Audited decorator (AUTH-07)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UseInterceptors, Controller, Post, Body, Get } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import request from 'supertest';
import { Model } from 'mongoose';
import { Auditoria, AuditoriaSchema } from '../../src/modules/auditoria/schemas/auditoria.schema';
import { AuditoriaService } from '../../src/modules/auditoria/auditoria.service';
import { AuditoriaRepository } from '../../src/modules/auditoria/auditoria.repository';
import { AuditInterceptor } from '../../src/modules/auditoria/interceptors/audit.interceptor';
import { Audited } from '../../src/modules/auditoria/decorators/audited.decorator';

// Dummy controller for testing
@Controller('test')
@UseInterceptors(AuditInterceptor)
class DummyController {
  @Post('create')
  @Audited('foo', 'create')
  create(@Body() body: Record<string, unknown>) {
    return { _id: 'abc123', ...body };
  }

  @Post('update')
  @Audited('foo', 'update', { diffBefore: (req) => req.body['__before'] as unknown })
  update(@Body() body: Record<string, unknown>) {
    const { __before: _b, ...rest } = body;
    return { _id: 'abc123', ...rest };
  }

  @Get('error')
  @Audited('foo', 'delete')
  throwError(): never {
    throw new Error('Handler failed');
  }
}

describe('AuditInterceptor', () => {
  let app: INestApplication;
  let auditoriaModel: Model<Auditoria>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(process.env.MONGO_URI!),
        MongooseModule.forFeature([{ name: Auditoria.name, schema: AuditoriaSchema }]),
        EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
      ],
      controllers: [DummyController],
      providers: [AuditoriaService, AuditoriaRepository, AuditInterceptor],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    auditoriaModel = module.get<Model<Auditoria>>(getModelToken(Auditoria.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await auditoriaModel.deleteMany({});
  });

  it('create handler produces audit record with correct fields', async () => {
    await request(app.getHttpServer())
      .post('/test/create')
      .send({ nombre: 'test' })
      .expect(201);

    // Wait for setImmediate to flush
    await new Promise<void>((r) => setImmediate(r));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(1);
    expect(records[0].accion).toBe('create');
    expect(records[0].recurso).toBe('foo');
    expect(records[0].recursoId).toBe('abc123');
    expect(records[0].cambios).toBeNull();
  });

  it('update handler produces audit record with cambios (diff)', async () => {
    await request(app.getHttpServer())
      .post('/test/update')
      .send({ __before: { nombre: 'old' }, nombre: 'new' })
      .expect(201);

    await new Promise<void>((r) => setImmediate(r));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(1);
    expect(records[0].accion).toBe('update');
    expect(records[0].cambios).not.toBeNull();
    expect(records[0].cambios).toHaveProperty('nombre');
  });

  it('error in handler does NOT write audit record', async () => {
    await request(app.getHttpServer())
      .get('/test/error')
      .expect(500);

    await new Promise<void>((r) => setImmediate(r));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(0);
  });
});
