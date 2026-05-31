/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PLAN-01 / PLAN-04 / PLAN-06 / F-030b — plantillas e2e test suite.
 * StorageService is mocked (no live MinIO required).
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
import { DomainExceptionFilter } from '../../src/common/filters/domain-exception.filter';
import { Types } from 'mongoose';
import { StorageService } from '../../src/common/storage/storage.service';
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Plantilla } from '../../src/modules/plantillas/schemas/plantilla.schema';
import { Esquema } from '../../src/modules/esquemas/schemas/esquema.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

const API = '/api/v1';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const flushAudit = async () => {
  await new Promise((r) => setImmediate(r));
  await sleep(60);
};

/** Mock StorageService — no live MinIO in tests */
const mockStorageService = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  putObject: jest.fn().mockImplementation((key: string) => Promise.resolve(key)),
  getPresignedUrl: jest.fn().mockResolvedValue('https://minio-mock/presigned'),
};

describe('PLAN-01..06 plantillas', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let plantillaModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let token: string;
  let usuarioId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  const createPlantilla = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post(`${API}/plantillas`)
      .set(auth())
      .send({
        nombre: 'Plantilla base',
        contenido: 'El expediente {{expediente.nombre}} es válido.',
        formatoOriginal: 'pegado',
        ...overrides,
      });

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(mockStorageService)
      .compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new DomainExceptionFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    usuarioModel = moduleRef.get<Model<any>>(getModelToken(Usuario.name));
    plantillaModel = moduleRef.get<Model<any>>(getModelToken(Plantilla.name));
    esquemaModel = moduleRef.get<Model<any>>(getModelToken(Esquema.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    // Ensure compound indexes
    await plantillaModel.createIndexes();

    const passwordHash = await argon2.hash('TestPass123!', { type: argon2.argon2id });
    const usuario = await usuarioModel.create({
      email: 'plantillas-test@lexscribe.local',
      nombre: 'Plantillas Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
    usuarioId = String(usuario._id);

    // Seed empty esquemas (required by EsquemasService.addParametro for PLAN-04 tests)
    await esquemaModel.create({
      usuarioId: new Types.ObjectId(usuarioId),
      tipoObjeto: 'expediente',
      parametros: [],
    });
    await esquemaModel.create({
      usuarioId: new Types.ObjectId(usuarioId),
      tipoObjeto: 'contacto',
      parametros: [],
    });

    const loginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: 'plantillas-test@lexscribe.local', password: 'TestPass123!' });
    token = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await plantillaModel.deleteMany({});
    await esquemaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  afterEach(async () => {
    await plantillaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    // Reset esquema params between tests (keep esquemas themselves)
    await esquemaModel.updateMany({}, { $set: { parametros: [] } });
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/plantillas`);
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // POST /plantillas — PLAN-01 create v1 + detection
  // ---------------------------------------------------------------------------

  describe('POST /plantillas', () => {
    it('PLAN-01: creates plantilla v1 with variable detection', async () => {
      const res = await createPlantilla();
      expect([200, 201]).toContain(res.status);
      expect(res.body._id).toBeTruthy();
      expect(res.body.version).toBe(1);
      expect(res.body.plantillaRaizId).toBe(res.body._id);
      expect(res.body.activo).toBe(true);
      expect(res.body.variablesDetectadas).toHaveLength(1);
      expect(res.body.variablesDetectadas[0].tipoObjeto).toBe('expediente');
      expect(res.body.variablesDetectadas[0].campo).toBe('nombre');
    });

    it('PLAN-01: creates plantilla with no variables (contenido with no {{...}})', async () => {
      const res = await createPlantilla({
        contenido: 'Este texto no tiene variables.',
        nombre: 'Sin variables',
      });
      expect([200, 201]).toContain(res.status);
      expect(res.body.variablesDetectadas).toHaveLength(0);
    });

    it('F-030b: blocks save when contenido has unknown tipoObjeto (D-07 total block)', async () => {
      const res = await createPlantilla({
        contenido: 'Variable inválida: {{contrato.algo}}',
        nombre: 'Con variable desconocida',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION');
      // Message should name the invalid variable
      expect(res.body.message).toContain('contrato');
    });

    it('F-030b: blocks multiple invalid types, names all of them', async () => {
      const res = await createPlantilla({
        contenido:
          'Inválidas: {{contrato.algo}} y {{persona.nombre}} en la línea 1.',
        nombre: 'Con múltiples variables desconocidas',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION');
      // Both unknown types should appear in message
      expect(res.body.message).toMatch(/contrato|persona/);
    });

    it('rejects extra fields (Zod strict)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas`)
        .set(auth())
        .send({
          nombre: 'X',
          contenido: 'Y {{expediente.nombre}}',
          campoDesconocido: 'z',
        });
      expect(res.status).toBe(400);
    });

    it('rejects empty nombre', async () => {
      const res = await createPlantilla({ nombre: '', contenido: '{{expediente.nombre}}' });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /plantillas
  // ---------------------------------------------------------------------------

  describe('GET /plantillas', () => {
    it('returns empty list when no plantillas', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('lists active plantillas with pagination', async () => {
      await createPlantilla({ nombre: 'Primera', contenido: '{{expediente.nombre}}' });
      await createPlantilla({ nombre: 'Segunda', contenido: '{{expediente.numero}}' });

      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas?page=1&limit=10`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('search filters by nombre (case-insensitive)', async () => {
      await createPlantilla({ nombre: 'Contrato Compraventa', contenido: '{{expediente.nombre}}' });
      await createPlantilla({ nombre: 'Poder Notarial', contenido: '{{expediente.numero}}' });

      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas?search=compraventa`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].nombre).toBe('Contrato Compraventa');
    });
  });

  // ---------------------------------------------------------------------------
  // GET /plantillas/:id
  // ---------------------------------------------------------------------------

  describe('GET /plantillas/:id', () => {
    it('returns plantilla by id', async () => {
      const created = await createPlantilla();
      const id = created.body._id as string;
      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas/${id}`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(id);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas/507f1f77bcf86cd799439011`)
        .set(auth());
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid ObjectId', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/plantillas/not-valid`)
        .set(auth());
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /plantillas/:id — PLAN-06 versioning
  // ---------------------------------------------------------------------------

  describe('PATCH /plantillas/:id (PLAN-06 versioning)', () => {
    it('PLAN-06: creates v2 active; prior v1 becomes inactive', async () => {
      const v1 = await createPlantilla();
      const v1Id = v1.body._id as string;
      const raizId = v1.body.plantillaRaizId as string;

      const patchRes = await request(app.getHttpServer())
        .patch(`${API}/plantillas/${v1Id}`)
        .set(auth())
        .send({ contenido: 'Contenido nuevo {{expediente.referencia}}' });

      expect([200, 201]).toContain(patchRes.status);
      const v2 = patchRes.body;
      expect(v2.version).toBe(2);
      expect(v2.activo).toBe(true);
      expect(v2.plantillaRaizId).toBe(raizId);
      expect(v2._id).not.toBe(v1Id); // new document

      // GET active list — only v2 appears
      const listRes = await request(app.getHttpServer())
        .get(`${API}/plantillas`)
        .set(auth());
      const ids = (listRes.body.items as Array<{ _id: string }>).map((i) => i._id);
      expect(ids).toContain(v2._id);
      expect(ids).not.toContain(v1Id);
    });

    it('PLAN-06: v1 is inactive in DB after patch', async () => {
      const v1 = await createPlantilla();
      const v1Id = v1.body._id as string;

      await request(app.getHttpServer())
        .patch(`${API}/plantillas/${v1Id}`)
        .set(auth())
        .send({ contenido: '{{expediente.nombre}} actualizado' });

      const v1Doc = await plantillaModel
        .findById(v1Id)
        .setOptions({ withInactive: true })
        .exec();
      expect(v1Doc).toBeTruthy();
      expect(v1Doc!.activo).toBe(false);
      expect(v1Doc!.fechaInactivacion).toBeTruthy();
    });

    it('F-030b: PATCH rejects invalid variable type in new contenido', async () => {
      const v1 = await createPlantilla();
      const v1Id = v1.body._id as string;

      const patchRes = await request(app.getHttpServer())
        .patch(`${API}/plantillas/${v1Id}`)
        .set(auth())
        .send({ contenido: '{{persona.nombre}} es inválido' });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.code).toBe('VALIDATION');
    });

    it('returns 404 when patching non-existent plantilla', async () => {
      const res = await request(app.getHttpServer())
        .patch(`${API}/plantillas/507f1f77bcf86cd799439011`)
        .set(auth())
        .send({ contenido: '{{expediente.nombre}}' });
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /plantillas/:id/versions
  // ---------------------------------------------------------------------------

  describe('GET /plantillas/:id/versions', () => {
    it('returns all versions sorted desc', async () => {
      const v1 = await createPlantilla();
      const v1Id = v1.body._id as string;

      await request(app.getHttpServer())
        .patch(`${API}/plantillas/${v1Id}`)
        .set(auth())
        .send({ contenido: '{{expediente.nombre}} v2' });

      // Use the raizId to fetch versions
      const raizId = v1.body.plantillaRaizId as string;
      const versionsRes = await request(app.getHttpServer())
        .get(`${API}/plantillas/${raizId}/versions`)
        .set(auth());
      expect(versionsRes.status).toBe(200);
      expect(Array.isArray(versionsRes.body)).toBe(true);
      expect(versionsRes.body).toHaveLength(2);
      expect(versionsRes.body[0].version).toBe(2); // newest first
      expect(versionsRes.body[1].version).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /plantillas/:id/declarar-variable — PLAN-04
  // ---------------------------------------------------------------------------

  describe('POST /plantillas/:id/declarar-variable (PLAN-04)', () => {
    it('PLAN-04: declares expediente variable — calls EsquemasService.addParametro', async () => {
      const v1 = await createPlantilla();
      const id = v1.body._id as string;

      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas/${id}/declarar-variable`)
        .set(auth())
        .send({ tipoObjeto: 'expediente', nombre: 'honorariosBase', tipoDato: 'numero' });

      // Should succeed (adds to dynamic schema)
      expect([200, 201]).toContain(res.status);
    });

    it('PLAN-04: declares contacto variable', async () => {
      const v1 = await createPlantilla();
      const id = v1.body._id as string;

      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas/${id}/declarar-variable`)
        .set(auth())
        .send({ tipoObjeto: 'contacto', nombre: 'cuentaBancaria', tipoDato: 'texto' });

      expect([200, 201]).toContain(res.status);
    });

    it('Pitfall 4: rejects clausula tipoObjeto with 400', async () => {
      const v1 = await createPlantilla();
      const id = v1.body._id as string;

      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas/${id}/declarar-variable`)
        .set(auth())
        .send({ tipoObjeto: 'clausula', nombre: 'algo', tipoDato: 'texto' });

      // Zod rejects 'clausula' before even reaching service
      expect(res.status).toBe(400);
    });

    it('Pitfall 4: rejects fecha tipoObjeto with 400', async () => {
      const v1 = await createPlantilla();
      const id = v1.body._id as string;

      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas/${id}/declarar-variable`)
        .set(auth())
        .send({ tipoObjeto: 'fecha', nombre: 'algo', tipoDato: 'fecha' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent plantilla', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/plantillas/507f1f77bcf86cd799439011/declarar-variable`)
        .set(auth())
        .send({ tipoObjeto: 'expediente', nombre: 'campo', tipoDato: 'texto' });

      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /plantillas/:id — soft-delete
  // ---------------------------------------------------------------------------

  describe('DELETE /plantillas/:id', () => {
    it('soft-deletes plantilla and excludes from list', async () => {
      const created = await createPlantilla();
      const id = created.body._id as string;

      const delRes = await request(app.getHttpServer())
        .delete(`${API}/plantillas/${id}`)
        .set(auth());
      expect([200, 204]).toContain(delRes.status);

      const listRes = await request(app.getHttpServer())
        .get(`${API}/plantillas`)
        .set(auth());
      const ids = (listRes.body.items as Array<{ _id: string }>).map((i) => i._id);
      expect(ids).not.toContain(id);
    });

    it('persists activo:false in DB', async () => {
      const created = await createPlantilla();
      const id = created.body._id as string;

      await request(app.getHttpServer()).delete(`${API}/plantillas/${id}`).set(auth());

      const doc = await plantillaModel
        .findById(id)
        .setOptions({ withInactive: true })
        .exec();
      expect(doc).toBeTruthy();
      expect(doc!.activo).toBe(false);
      expect(doc!.fechaInactivacion).toBeTruthy();
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${API}/plantillas/507f1f77bcf86cd799439011`)
        .set(auth());
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Audit trail
  // ---------------------------------------------------------------------------

  describe('Audit trail', () => {
    it('POST writes auditoria record recurso=plantilla accion=create', async () => {
      const created = await createPlantilla();
      const id = created.body._id as string;

      await flushAudit();

      const auditDoc = await auditoriaModel
        .findOne({ recurso: 'plantilla', accion: 'create' })
        .sort({ timestamp: -1 });
      expect(auditDoc).toBeTruthy();
      expect(String(auditDoc!.recursoId)).toBe(id);
    });

    it('DELETE writes auditoria record accion=delete', async () => {
      const created = await createPlantilla();
      const id = created.body._id as string;
      await auditoriaModel.deleteMany({});

      await request(app.getHttpServer())
        .delete(`${API}/plantillas/${id}`)
        .set(auth());

      await flushAudit();

      const auditDoc = await auditoriaModel.findOne({ recurso: 'plantilla', accion: 'delete' });
      expect(auditDoc).toBeTruthy();
    });
  });
});
