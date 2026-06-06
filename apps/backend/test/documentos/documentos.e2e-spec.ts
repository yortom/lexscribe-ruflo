/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DOC-05 / DOC-06 — documentos e2e test suite.
 * StorageService is mocked (no live MinIO required).
 * Covers:
 *   DOC-06: POST /documentos/upload/:expedienteId — .txt buffer → 201, tipo=subido, formato=txt
 *   DOC-06: upload with .exe → 400 (ValidationError)
 *   DOC-05: GET /documentos/:id/download → 200 with { url }
 *   list:   GET /documentos?expedienteId=... → items sorted by fechaCreacion desc
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { ZodValidationPipe } from 'nestjs-zod';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { DomainExceptionFilter } from '../../src/common/filters/domain-exception.filter';
import { StorageService } from '../../src/common/storage/storage.service';
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Documento } from '../../src/modules/documentos/schemas/documento.schema';
import { Expediente } from '../../src/modules/expedientes/schemas/expediente.schema';
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
  getObject: jest.fn().mockResolvedValue(Buffer.from('fake-docx-content')),
  getPresignedUrl: jest.fn().mockResolvedValue('https://minio-mock/presigned'),
};

describe('DOC-05/06 documentos', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let documentoModel: Model<any>;
  let expedienteModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let token: string;
  let usuarioId: string;
  let expedienteId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });

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
    documentoModel = moduleRef.get<Model<any>>(getModelToken(Documento.name));
    expedienteModel = moduleRef.get<Model<any>>(getModelToken(Expediente.name));
    esquemaModel = moduleRef.get<Model<any>>(getModelToken(Esquema.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    // Create user
    const passwordHash = await argon2.hash('TestPass123!', { type: argon2.argon2id });
    const usuario = await usuarioModel.create({
      email: 'documentos-test@lexscribe.local',
      nombre: 'Documentos Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
    usuarioId = String(usuario._id);

    // Seed empty esquemas
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

    // Login
    const loginRes = await request(app.getHttpServer())
      .post(`${API}/auth/login`)
      .send({ email: 'documentos-test@lexscribe.local', password: 'TestPass123!' });
    token = loginRes.body.accessToken as string;

    // Create expediente
    const expRes = await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set(auth())
      .send({ nombre: 'Expediente para documentos' });
    expedienteId = expRes.body._id as string;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await documentoModel.deleteMany({});
    await expedienteModel.deleteMany({});
    await esquemaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  afterEach(async () => {
    await documentoModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    jest.clearAllMocks();
    // Re-apply mocks that jest.clearAllMocks resets
    mockStorageService.putObject.mockImplementation((key: string) => Promise.resolve(key));
    mockStorageService.getObject.mockResolvedValue(Buffer.from('fake-docx-content'));
    mockStorageService.getPresignedUrl.mockResolvedValue('https://minio-mock/presigned');
  });

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/documentos?expedienteId=${expedienteId}`);
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // DOC-06: POST /documentos/upload/:expedienteId
  // ---------------------------------------------------------------------------

  describe('DOC-06: POST /documentos/upload/:expedienteId', () => {
    it('DOC-06: uploads .txt → 201, tipo=subido, formato=txt, storagePath starts with documentos/subidos/', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('contenido de texto'), 'nota.txt')
        .field('nombre', 'Mi nota de texto');

      expect([200, 201]).toContain(res.status);
      expect(res.body._id).toBeTruthy();
      expect(res.body.tipo).toBe('subido');
      expect(res.body.formato).toBe('txt');
      expect(res.body.storagePath).toMatch(/^documentos\/subidos\//);
      expect(res.body.nombre).toBe('Mi nota de texto');
    });

    it('DOC-06: uploads .docx → 201, tipo=subido, formato=docx', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('fake docx bytes'), 'contrato.docx')
        .field('nombre', 'Contrato subido');

      expect([200, 201]).toContain(res.status);
      expect(res.body.tipo).toBe('subido');
      expect(res.body.formato).toBe('docx');
    });

    it('DOC-06: uploads .pdf → 201, tipo=subido, formato=pdf', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('%PDF-1.4'), 'escrito.pdf')
        .field('nombre', 'Escrito PDF');

      expect([200, 201]).toContain(res.status);
      expect(res.body.formato).toBe('pdf');
    });

    it('DOC-06: upload with .exe extension → 400 (ValidationError)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('malware'), 'virus.exe')
        .field('nombre', 'Archivo malicioso');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION');
    });

    it('DOC-06: upload without nombre → 400', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('data'), 'doc.txt');
      // nombre is required
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DOC-05: GET /documentos/:id/download
  // ---------------------------------------------------------------------------

  describe('DOC-05: GET /documentos/:id/download', () => {
    it('DOC-05: returns 200 with { url } presigned mock URL', async () => {
      // First upload a document to get an id
      const uploadRes = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('docx bytes'), 'doc.docx')
        .field('nombre', 'Doc para descargar');
      expect([200, 201]).toContain(uploadRes.status);

      const docId = uploadRes.body._id as string;

      const downloadRes = await request(app.getHttpServer())
        .get(`${API}/documentos/${docId}/download`)
        .set(auth());

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body).toHaveProperty('url');
      expect(typeof downloadRes.body.url).toBe('string');
      expect(downloadRes.body.url).toContain('minio-mock');
    });

    it('DOC-05: getPresignedUrl called with TTL=300', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('docx bytes'), 'doc2.docx')
        .field('nombre', 'Doc TTL check');

      const docId = uploadRes.body._id as string;

      await request(app.getHttpServer())
        .get(`${API}/documentos/${docId}/download`)
        .set(auth());

      expect(mockStorageService.getPresignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        300,
      );
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/documentos/507f1f77bcf86cd799439099/download`)
        .set(auth());
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /documentos?expedienteId=...
  // ---------------------------------------------------------------------------

  describe('GET /documentos?expedienteId=...', () => {
    it('list: returns items sorted by fechaCreacion desc', async () => {
      // Upload 2 documents in sequence
      await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('a'), 'primero.txt')
        .field('nombre', 'Primero');

      // Small delay to ensure distinct fechaCreacion values
      await sleep(10);

      await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('b'), 'segundo.txt')
        .field('nombre', 'Segundo');

      const res = await request(app.getHttpServer())
        .get(`${API}/documentos?expedienteId=${expedienteId}`)
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
      // Newest first (Segundo uploaded after Primero)
      expect(res.body.items[0].nombre).toBe('Segundo');
      expect(res.body.items[1].nombre).toBe('Primero');
    });

    it('returns empty list when no documents', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/documentos?expedienteId=${expedienteId}`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it('returns 400 when expedienteId is missing', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/documentos`)
        .set(auth());
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /documentos/:id
  // ---------------------------------------------------------------------------

  describe('DELETE /documentos/:id', () => {
    it('soft-deletes document and excludes from list', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('content'), 'todrop.txt')
        .field('nombre', 'A borrar');
      const docId = uploadRes.body._id as string;

      const delRes = await request(app.getHttpServer())
        .delete(`${API}/documentos/${docId}`)
        .set(auth());
      expect([200, 204]).toContain(delRes.status);

      // Document no longer in list
      const listRes = await request(app.getHttpServer())
        .get(`${API}/documentos?expedienteId=${expedienteId}`)
        .set(auth());
      const ids = (listRes.body.items as Array<{ _id: string }>).map((i) => i._id);
      expect(ids).not.toContain(docId);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`${API}/documentos/507f1f77bcf86cd799439099`)
        .set(auth());
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Audit trail
  // ---------------------------------------------------------------------------

  describe('Audit trail', () => {
    it('upload writes auditoria record recurso=documento accion=create', async () => {
      const uploadRes = await request(app.getHttpServer())
        .post(`${API}/documentos/upload/${expedienteId}`)
        .set(auth())
        .attach('file', Buffer.from('audit test'), 'audit.txt')
        .field('nombre', 'Audit doc');
      const docId = uploadRes.body._id as string;

      await flushAudit();

      const auditDoc = await auditoriaModel
        .findOne({ recurso: 'documento', accion: 'create' })
        .sort({ timestamp: -1 });
      expect(auditDoc).toBeTruthy();
      expect(String(auditDoc!.recursoId)).toBe(docId);
    });
  });
});
