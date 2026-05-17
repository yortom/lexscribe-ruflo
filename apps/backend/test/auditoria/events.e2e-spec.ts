/**
 * events.e2e-spec.ts
 * Integration tests for AuditListener: link/unlink/generate events (AUTH-07)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Auditoria, AuditoriaSchema } from '../../src/modules/auditoria/schemas/auditoria.schema';
import { AuditoriaService } from '../../src/modules/auditoria/auditoria.service';
import { AuditoriaRepository } from '../../src/modules/auditoria/auditoria.repository';
import { AuditListener } from '../../src/modules/auditoria/listeners/audit.listener';

describe('AuditListener events (AUTH-07)', () => {
  let app: INestApplication;
  let eventEmitter: EventEmitter2;
  let auditoriaModel: Model<Auditoria>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(process.env.MONGO_URI!),
        MongooseModule.forFeature([{ name: Auditoria.name, schema: AuditoriaSchema }]),
        EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
      ],
      providers: [AuditoriaService, AuditoriaRepository, AuditListener],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    eventEmitter = module.get(EventEmitter2);
    auditoriaModel = module.get<Model<Auditoria>>(getModelToken(Auditoria.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await auditoriaModel.deleteMany({});
  });

  it('expediente.linked produces link audit record', async () => {
    eventEmitter.emit('expediente.linked', {
      usuarioId: 'user1',
      recurso: 'expediente',
      recursoId: 'exp1',
      contexto: { contactoId: 'c1', rol: 'demandante' },
    });

    await new Promise<void>((r) => setImmediate(r));
    // Wait for async listener
    await new Promise<void>((r) => setTimeout(r, 50));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(1);
    expect(records[0].accion).toBe('link');
    expect(records[0].recurso).toBe('expediente');
    expect(records[0].recursoId).toBe('exp1');
  });

  it('expediente.unlinked produces unlink audit record', async () => {
    eventEmitter.emit('expediente.unlinked', {
      usuarioId: 'user1',
      recurso: 'expediente',
      recursoId: 'exp1',
      contexto: { contactoId: 'c1' },
    });

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setTimeout(r, 50));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(1);
    expect(records[0].accion).toBe('unlink');
  });

  it('documento.generated produces generate audit record', async () => {
    eventEmitter.emit('documento.generated', {
      usuarioId: 'user1',
      recurso: 'documento',
      recursoId: 'doc1',
      contexto: { plantillaId: 'p1' },
    });

    await new Promise<void>((r) => setImmediate(r));
    await new Promise<void>((r) => setTimeout(r, 50));

    const records = await auditoriaModel.find().lean();
    expect(records).toHaveLength(1);
    expect(records[0].accion).toBe('generate');
  });
});
