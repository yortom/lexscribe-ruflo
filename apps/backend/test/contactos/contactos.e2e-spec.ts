/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Usuario } from '../../src/modules/usuarios/schemas/usuario.schema';
import { Contacto } from '../../src/modules/contactos/schemas/contacto.schema';
import { Esquema } from '../../src/modules/esquemas/schemas/esquema.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

describe('CONT-01..05 contactos', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let contactoModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let bearerToken: string;
  let usuarioId: string;

  const BASE_CONTACTO = {
    tipo: 'fisica',
    tipologia: 'cliente',
    nombre: 'Ana López',
    documentacionFiscal: '12345678A',
    email: 'ana@test.es',
    telefono: '+34600000000',
  };

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
    contactoModel = moduleRef.get<Model<any>>(getModelToken(Contacto.name));
    esquemaModel = moduleRef.get<Model<any>>(getModelToken(Esquema.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    // Seed: create user with argon2id hash
    const passwordHash = await argon2.hash('TestPass123!', {
      type: argon2.argon2id,
    });
    const usuario = await usuarioModel.create({
      email: 'contactos-test@lexscribe.local',
      nombre: 'Contactos Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
    usuarioId = String(usuario._id);

    // Seed: create empty esquema for contacto (required by EsquemasService.addParametro)
    await esquemaModel.create({
      usuarioId: new Types.ObjectId(usuarioId),
      tipoObjeto: 'contacto',
      parametros: [],
    });

    // Login to get bearer token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'contactos-test@lexscribe.local',
        password: 'TestPass123!',
      });

    bearerToken = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await contactoModel.deleteMany({});
    await esquemaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  afterEach(async () => {
    await contactoModel.deleteMany({});
    await auditoriaModel.deleteMany({});
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/contactos');
    expect(res.status).toBe(401);
  });

  it('rejects body with extra fields (Zod strict)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tipo: 'fisica',
        tipologia: 'cliente',
        nombre: 'X',
        usuarioId: 'haxxx',
      });
    // nestjs-zod ZodValidationPipe throws BadRequestException (not DomainError)
    // so the response has statusCode:400 but body uses NestJS default shape
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // CONT-01 + CONT-02: create
  // ---------------------------------------------------------------------------

  it('CONT-01/02: creates persona física with base fields and tipologia', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    expect([200, 201]).toContain(res.status);
    expect(res.body._id).toBeTruthy();
    expect(res.body.usuarioId).toBeTruthy();
    expect(res.body.tipo).toBe('fisica');
    expect(res.body.tipologia).toBe('cliente');
    expect(res.body.nombre).toBe('Ana López');
    expect(res.body.activo).toBe(true);
  });

  it('CONT-01: creates persona jurídica', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tipo: 'juridica',
        tipologia: 'cliente',
        nombre: 'Acme S.L.',
        documentacionFiscal: 'B12345678',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.tipo).toBe('juridica');
  });

  it('CONT-02: rejects invalid tipologia', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ tipo: 'fisica', tipologia: 'invalido', nombre: 'X' });

    // nestjs-zod ZodValidationPipe rejects invalid enum values with 400
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // CONT-03: parámetros dinámicos
  // ---------------------------------------------------------------------------

  it('CONT-03: registers new parametros into esquema contacto', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tipo: 'fisica',
        tipologia: 'interesado',
        nombre: 'Param Test',
        parametros: { profesion: 'Abogado', estadoCivil: 'Casado' },
      });

    expect([200, 201]).toContain(res.status);

    const esquema = await esquemaModel.findOne({
      tipoObjeto: 'contacto',
      usuarioId: new Types.ObjectId(usuarioId),
    });

    expect(esquema).toBeTruthy();
    const nombres = esquema!.parametros.map((p: any) => p.nombre);
    expect(nombres).toContain('profesion');
    expect(nombres).toContain('estadoCivil');
    const profesion = esquema!.parametros.find((p: any) => p.nombre === 'profesion');
    expect(profesion!.tipoDato).toBe('texto');
  });

  it('CONT-03: idempotent — repeating same parametro key does not duplicate', async () => {
    // First create
    await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tipo: 'fisica',
        tipologia: 'otros',
        nombre: 'Idem Test 1',
        parametros: { profesion: 'X' },
      });

    // Second create with same key
    await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({
        tipo: 'fisica',
        tipologia: 'otros',
        nombre: 'Idem Test 2',
        parametros: { profesion: 'Y' },
      });

    const esquema = await esquemaModel.findOne({
      tipoObjeto: 'contacto',
      usuarioId: new Types.ObjectId(usuarioId),
    });

    const profesionEntries = esquema!.parametros.filter(
      (p: any) => p.nombre === 'profesion',
    );
    expect(profesionEntries).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // CONT-04: listado, búsqueda, filtro, paginación
  // ---------------------------------------------------------------------------

  it('CONT-04: lists with pagination envelope', async () => {
    // Create 3 contacts
    await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Contact A' }),
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Contact B' }),
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Contact C' }),
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/contactos?page=1&limit=2')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('CONT-04: filters by tipologia', async () => {
    // 2 clientes + 1 parte_contraria
    await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Cliente 1' }),
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Cliente 2' }),
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({
          tipo: 'fisica',
          tipologia: 'parte_contraria',
          nombre: 'Parte Contraria',
        }),
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/contactos?tipologia=cliente')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    for (const item of res.body.items) {
      expect(item.tipologia).toBe('cliente');
    }
  });

  it('CONT-04: searches by nombre via $text index', async () => {
    await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Ana López' }),
      request(app.getHttpServer())
        .post('/api/v1/contactos')
        .set('Authorization', `Bearer ${bearerToken}`)
        .send({ tipo: 'fisica', tipologia: 'cliente', nombre: 'Luis Pérez' }),
    ]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/contactos?search=Ana')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].nombre).toBe('Ana López');
  });

  // ---------------------------------------------------------------------------
  // CONT-05: detalle + expedientesVinculados stub
  // ---------------------------------------------------------------------------

  it('CONT-05: detail includes empty expedientesVinculados array', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    const id = createRes.body._id as string;

    const res = await request(app.getHttpServer())
      .get(`/api/v1/contactos/${id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.expedientesVinculados).toEqual([]);
  });

  it('CONT-05: returns 404 for non-existent id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/contactos/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  // ---------------------------------------------------------------------------
  // Soft-delete
  // ---------------------------------------------------------------------------

  it('soft-deletes via DELETE and excludes from list', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    const id = createRes.body._id as string;

    const delRes = await request(app.getHttpServer())
      .delete(`/api/v1/contactos/${id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    expect([200, 204]).toContain(delRes.status);

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`);

    const ids = (listRes.body.items as Array<{ _id: string }>).map((i) => i._id);
    expect(ids).not.toContain(id);
  });

  it('soft-delete persists activo:false in DB', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    const id = createRes.body._id as string;

    await request(app.getHttpServer())
      .delete(`/api/v1/contactos/${id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    const doc = await contactoModel
      .findOne({ _id: id }, null, { withInactive: true })
      .exec();

    expect(doc).toBeTruthy();
    expect(doc!.activo).toBe(false);
    expect(doc!.fechaInactivacion).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Audit (cierre del bucle)
  // ---------------------------------------------------------------------------

  it('audit: POST creates auditoria record with recurso=contacto, accion=create', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    // Wait for setImmediate-based async write to complete
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'contacto', accion: 'create' })
      .sort({ timestamp: -1 });

    expect(auditDoc).toBeTruthy();
  });

  it('audit: DELETE creates auditoria record with accion=delete', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/contactos')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(BASE_CONTACTO);

    const id = createRes.body._id as string;

    // Clear audit records from the create
    await auditoriaModel.deleteMany({});

    await request(app.getHttpServer())
      .delete(`/api/v1/contactos/${id}`)
      .set('Authorization', `Bearer ${bearerToken}`);

    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'contacto', accion: 'delete' })
      .sort({ timestamp: -1 });

    expect(auditDoc).toBeTruthy();
  });
});
