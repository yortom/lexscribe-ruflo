/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Clausula } from '../../src/modules/clausulas/schemas/clausula.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

describe('CLAU-01..03 clausulas', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let clausulaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let bearerToken: string;

  const auth = () => ({ Authorization: `Bearer ${bearerToken}` });

  const createClausula = (overrides: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/clausulas')
      .set(auth())
      .send({ nombre: 'Cláusula base', texto: 'Texto de la cláusula base', ...overrides });

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
    clausulaModel = moduleRef.get<Model<any>>(getModelToken(Clausula.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    // Ensure $text + compound indexes exist before search tests run
    await clausulaModel.createIndexes();

    const passwordHash = await argon2.hash('TestPass123!', { type: argon2.argon2id });
    await usuarioModel.create({
      email: 'clausulas-test@lexscribe.local',
      nombre: 'Clausulas Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });

    const loginRes = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'clausulas-test@lexscribe.local',
      password: 'TestPass123!',
    });
    bearerToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await clausulaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  afterEach(async () => {
    await clausulaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/clausulas');
    expect(res.status).toBe(401);
  });

  // ---------------------------------------------------------------------------
  // POST /clausulas — CLAU-01 + CLAU-02
  // ---------------------------------------------------------------------------

  describe('POST /clausulas', () => {
    it('CLAU-01: creates a clausula with nombre + texto', async () => {
      const res = await createClausula();
      expect([200, 201]).toContain(res.status);
      expect(res.body._id).toBeTruthy();
      expect(res.body.usuarioId).toBeTruthy();
      expect(res.body.nombre).toBe('Cláusula base');
      expect(res.body.texto).toBe('Texto de la cláusula base');
      expect(res.body.labels).toEqual([]);
      expect(res.body.activo).toBe(true);
    });

    it('CLAU-02: creates a clausula with multiple labels normalized to lowercase', async () => {
      const res = await createClausula({ labels: ['Garantia', 'COMPRAVENTA', '  Arras '] });
      expect([200, 201]).toContain(res.status);
      expect(res.body.labels).toEqual(['garantia', 'compraventa', 'arras']);
    });

    it('rejects body with extra fields (Zod strict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/clausulas')
        .set(auth())
        .send({ nombre: 'X', texto: 'Y', foo: 'bar' });
      expect(res.status).toBe(400);
    });

    it('rejects usuarioId injected in body (Zod strict)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/clausulas')
        .set(auth())
        .send({ nombre: 'X', texto: 'Y', usuarioId: 'haxxx' });
      expect(res.status).toBe(400);
    });

    it('rejects empty nombre/texto', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/clausulas')
        .set(auth())
        .send({ nombre: '', texto: '' });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /clausulas — CLAU-03 (search + label filter) + listing
  // ---------------------------------------------------------------------------

  describe('GET /clausulas', () => {
    it('returns empty list when no clausulas', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/clausulas').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
    });

    it('lists with pagination envelope', async () => {
      await createClausula({ nombre: 'Uno', texto: 'a' });
      await createClausula({ nombre: 'Dos', texto: 'b' });
      await createClausula({ nombre: 'Tres', texto: 'c' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?page=1&limit=2')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.limit).toBe(2);
    });

    it('CLAU-03: full-text $search returns only matching docs', async () => {
      await createClausula({ nombre: 'Cláusula hipoteca', texto: 'Sobre la hipoteca del inmueble' });
      await createClausula({ nombre: 'Cláusula arras', texto: 'Sobre las arras penitenciales' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?search=hipoteca')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].nombre).toBe('Cláusula hipoteca');
    });

    it('CLAU-03: search matches text body, not just nombre', async () => {
      await createClausula({ nombre: 'Genérica A', texto: 'contiene la palabra usufructo aquí' });
      await createClausula({ nombre: 'Genérica B', texto: 'sin coincidencia alguna' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?search=usufructo')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].nombre).toBe('Genérica A');
    });

    it('CLAU-03: filters by label', async () => {
      await createClausula({ nombre: 'Con garantia', texto: 'x', labels: ['garantia'] });
      await createClausula({ nombre: 'Con arras', texto: 'y', labels: ['arras'] });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?label=garantia')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].nombre).toBe('Con garantia');
    });

    it('CLAU-03: label filter is case-insensitive (lowercase normalization)', async () => {
      await createClausula({ nombre: 'Garantizada', texto: 'x', labels: ['Garantia'] });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?label=GARANTIA')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].nombre).toBe('Garantizada');
    });

    it('clausula without labels does not appear when filtering by label', async () => {
      await createClausula({ nombre: 'Sin labels', texto: 'x' });

      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas?label=garantia')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /clausulas/:id
  // ---------------------------------------------------------------------------

  describe('GET /clausulas/:id', () => {
    it('returns clausula by id', async () => {
      const created = await createClausula();
      const id = created.body._id as string;
      const res = await request(app.getHttpServer())
        .get(`/api/v1/clausulas/${id}`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body._id).toBe(id);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas/507f1f77bcf86cd799439011')
        .set(auth());
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid ObjectId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/clausulas/not-valid')
        .set(auth());
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // PATCH /clausulas/:id
  // ---------------------------------------------------------------------------

  describe('PATCH /clausulas/:id', () => {
    it('CLAU-01: updates nombre/texto/labels', async () => {
      const created = await createClausula();
      const id = created.body._id as string;

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/clausulas/${id}`)
        .set(auth())
        .send({ nombre: 'Editada', labels: ['Nueva'] });

      expect(res.status).toBe(200);
      expect(res.body.nombre).toBe('Editada');
      expect(res.body.labels).toEqual(['nueva']);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/clausulas/507f1f77bcf86cd799439011')
        .set(auth())
        .send({ nombre: 'X' });
      expect(res.status).toBe(404);
    });

    it('returns 400 for unknown field', async () => {
      const created = await createClausula();
      const id = created.body._id as string;
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/clausulas/${id}`)
        .set(auth())
        .send({ desconocido: 'x' });
      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // DELETE /clausulas/:id — soft-delete
  // ---------------------------------------------------------------------------

  describe('DELETE /clausulas/:id', () => {
    it('soft-deletes and excludes from list', async () => {
      const created = await createClausula();
      const id = created.body._id as string;

      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/clausulas/${id}`)
        .set(auth());
      expect([200, 204]).toContain(delRes.status);

      const listRes = await request(app.getHttpServer()).get('/api/v1/clausulas').set(auth());
      const ids = (listRes.body.items as Array<{ _id: string }>).map((i) => i._id);
      expect(ids).not.toContain(id);
    });

    it('persists activo:false in DB', async () => {
      const created = await createClausula();
      const id = created.body._id as string;

      await request(app.getHttpServer()).delete(`/api/v1/clausulas/${id}`).set(auth());

      const doc = await clausulaModel.findOne({ _id: id }, null, { withInactive: true }).exec();
      expect(doc).toBeTruthy();
      expect(doc!.activo).toBe(false);
      expect(doc!.fechaInactivacion).toBeTruthy();
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/clausulas/507f1f77bcf86cd799439011')
        .set(auth());
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Audit trail
  // ---------------------------------------------------------------------------

  describe('Audit trail', () => {
    it('POST writes auditoria record recurso=clausula accion=create', async () => {
      const created = await createClausula();
      const id = created.body._id as string;

      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setTimeout(r, 50));

      const auditDoc = await auditoriaModel
        .findOne({ recurso: 'clausula', accion: 'create' })
        .sort({ timestamp: -1 });

      expect(auditDoc).toBeTruthy();
      expect(String(auditDoc!.recursoId)).toBe(id);
    });

    it('DELETE writes auditoria record accion=delete', async () => {
      const created = await createClausula();
      const id = created.body._id as string;
      await auditoriaModel.deleteMany({});

      await request(app.getHttpServer()).delete(`/api/v1/clausulas/${id}`).set(auth());

      await new Promise((r) => setImmediate(r));
      await new Promise((r) => setTimeout(r, 50));

      const auditDoc = await auditoriaModel
        .findOne({ recurso: 'clausula', accion: 'delete' })
        .sort({ timestamp: -1 });

      expect(auditDoc).toBeTruthy();
    });
  });
});
