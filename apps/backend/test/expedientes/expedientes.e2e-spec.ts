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
import { Expediente } from '../../src/modules/expedientes/schemas/expediente.schema';
import { Esquema } from '../../src/modules/esquemas/schemas/esquema.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

const API = '/api/v1';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const flushAudit = async () => {
  await new Promise((r) => setImmediate(r));
  await sleep(60);
};

describe('EXPE-01..07 expedientes + CONT-05 audit', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let contactoModel: Model<any>;
  let expedienteModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let token: string;
  let usuarioId: string;

  const createContacto = async (nombre = 'Contacto X') => {
    const res = await request(app.getHttpServer())
      .post(`${API}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo: 'fisica', tipologia: 'cliente', nombre });
    return res.body as { _id: string; nombre: string };
  };

  const createExpediente = async (nombre = 'Caso Demo', parametros?: Record<string, unknown>) => {
    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`)
      .send(parametros ? { nombre, parametros } : { nombre })
      .expect(201);
    return res.body as { _id: string; nombre: string };
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
    expedienteModel = moduleRef.get<Model<any>>(getModelToken(Expediente.name));
    esquemaModel = moduleRef.get<Model<any>>(getModelToken(Esquema.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    const passwordHash = await argon2.hash('TestPass123!', { type: argon2.argon2id });
    const usuario = await usuarioModel.create({
      email: 'expedientes-test@lexscribe.local',
      nombre: 'Expedientes Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });
    usuarioId = String(usuario._id);

    // Seed empty esquemas (required by EsquemasService.addParametro)
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

    const loginRes = await request(app.getHttpServer()).post(`${API}/auth/login`).send({
      email: 'expedientes-test@lexscribe.local',
      password: 'TestPass123!',
    });
    token = loginRes.body.accessToken as string;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await contactoModel.deleteMany({});
    await expedienteModel.deleteMany({});
    await esquemaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  afterEach(async () => {
    await contactoModel.deleteMany({});
    await expedienteModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    // reset esquema params between tests
    await esquemaModel.updateMany({}, { $set: { parametros: [] } });
  });

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app.getHttpServer()).get(`${API}/expedientes`);
    expect(res.status).toBe(401);
  });

  it('rejects body with extra fields (Zod strict)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X', usuarioId: 'haxxx' });
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // EXPE-01: create + EXPE-04 parámetros dinámicos
  // ---------------------------------------------------------------------------

  it('EXPE-01: creates expediente with auto fechaCreacion', async () => {
    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Hipoteca Acme' });

    expect([200, 201]).toContain(res.status);
    expect(res.body._id).toBeTruthy();
    expect(res.body.usuarioId).toBeTruthy();
    expect(res.body.nombre).toBe('Hipoteca Acme');
    expect(res.body.contactos).toEqual([]);
    expect(res.body.parametros).toEqual({});
    expect(res.body.activo).toBe(true);
    expect(res.body.fechaCreacion).toBeTruthy();
  });

  it('EXPE-04: create with parametros registers them into esquema expediente', async () => {
    await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Con Parametros',
        parametros: { honorariosBase: 1500, fechaVista: '2026-09-01', urgente: true, refCatastral: 'X' },
      })
      .expect(201);

    const esquema = await esquemaModel.findOne({
      tipoObjeto: 'expediente',
      usuarioId: new Types.ObjectId(usuarioId),
    });
    const byName = (n: string) => esquema!.parametros.find((p: any) => p.nombre === n);
    expect(byName('honorariosBase')!.tipoDato).toBe('numero');
    expect(byName('fechaVista')!.tipoDato).toBe('fecha');
    expect(byName('urgente')!.tipoDato).toBe('booleano');
    expect(byName('refCatastral')!.tipoDato).toBe('texto');
  });

  it('EXPE-04: idempotent parametro registration does not duplicate', async () => {
    await createExpediente('E1', { honorariosBase: 1000 });
    await createExpediente('E2', { honorariosBase: 2000 });
    const esquema = await esquemaModel.findOne({
      tipoObjeto: 'expediente',
      usuarioId: new Types.ObjectId(usuarioId),
    });
    const entries = esquema!.parametros.filter((p: any) => p.nombre === 'honorariosBase');
    expect(entries).toHaveLength(1);
  });

  it('EXPE-04: conflicting parametro tipoDato returns 409', async () => {
    await createExpediente('E1', { campo: 1000 }); // numero
    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'E2', parametros: { campo: 'texto' } }); // texto -> conflict
    expect(res.status).toBe(409);
  });

  // ---------------------------------------------------------------------------
  // EXPE-05: list / search / filter
  // ---------------------------------------------------------------------------

  it('EXPE-05: lists with pagination envelope', async () => {
    await createExpediente('Alpha');
    await createExpediente('Beta');
    await createExpediente('Gamma');

    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes?page=1&limit=2`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });

  it('EXPE-05: full-text search filters by nombre', async () => {
    await createExpediente('Hipoteca Banco');
    await createExpediente('Divorcio Express');

    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes?search=hipoteca`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].nombre).toBe('Hipoteca Banco');
  });

  it('EXPE-05: filters by contactoId returns only linked expedientes', async () => {
    const contacto = await createContacto('Vinculado');
    const expConVinculo = await createExpediente('Con vinculo');
    await createExpediente('Sin vinculo');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${expConVinculo._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes?contactoId=${contacto._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]._id).toBe(expConVinculo._id);
  });

  // ---------------------------------------------------------------------------
  // GET /:id detail + EXPE-06 / EXPE-07 placeholders
  // ---------------------------------------------------------------------------

  it('EXPE-06/07: detail returns documentos: [] and fechas: [] placeholders', async () => {
    const exp = await createExpediente('Detalle');
    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes/${exp._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.documentos).toEqual([]);
    expect(res.body.fechas).toEqual([]);
    expect(res.body.contactos).toEqual([]);
    expect(res.body.parametros).toEqual({});
  });

  it('GET /:id returns 404 for non-existent', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes/507f1f77bcf86cd799439011`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('GET /:id returns 400 for invalid ObjectId', async () => {
    const res = await request(app.getHttpServer())
      .get(`${API}/expedientes/not-valid`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ---------------------------------------------------------------------------
  // PATCH
  // ---------------------------------------------------------------------------

  it('PATCH /:id updates nombre and registers new parametros', async () => {
    const exp = await createExpediente('Original');
    const res = await request(app.getHttpServer())
      .patch(`${API}/expedientes/${exp._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Actualizado', parametros: { nuevoParam: 42 } });

    expect([200, 201]).toContain(res.status);
    expect(res.body.nombre).toBe('Actualizado');

    const esquema = await esquemaModel.findOne({
      tipoObjeto: 'expediente',
      usuarioId: new Types.ObjectId(usuarioId),
    });
    expect(esquema!.parametros.find((p: any) => p.nombre === 'nuevoParam')!.tipoDato).toBe('numero');
  });

  // ---------------------------------------------------------------------------
  // DELETE soft-delete
  // ---------------------------------------------------------------------------

  it('DELETE /:id soft-deletes and excludes from list', async () => {
    const exp = await createExpediente('A borrar');
    const del = await request(app.getHttpServer())
      .delete(`${API}/expedientes/${exp._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 204]).toContain(del.status);

    const list = await request(app.getHttpServer())
      .get(`${API}/expedientes`)
      .set('Authorization', `Bearer ${token}`);
    const ids = (list.body.items as Array<{ _id: string }>).map((i) => i._id);
    expect(ids).not.toContain(exp._id);

    const doc = await expedienteModel.findOne({ _id: exp._id }, null, { withInactive: true }).exec();
    expect(doc!.activo).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // EXPE-02 / EXPE-03: link contacto
  // ---------------------------------------------------------------------------

  it('EXPE-02: links a contacto with rol', async () => {
    const contacto = await createContacto('Cliente A');
    const exp = await createExpediente('Caso link');

    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.contactos).toHaveLength(1);
    expect(res.body.contactos[0].rol).toBe('cliente');
    expect(res.body.contactos[0].contactoId).toBe(contacto._id);
  });

  it('EXPE-03: duplicate (contactoId, rol) link returns 409 with legible message', async () => {
    const contacto = await createContacto('Cliente B');
    const exp = await createExpediente('Caso dup');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.message).toContain('ya vinculado');
  });

  it('EXPE-02: same contacto with different rol is allowed (no 409)', async () => {
    const contacto = await createContacto('Cliente C');
    const exp = await createExpediente('Caso roles');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'avalista' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.contactos).toHaveLength(2);
  });

  it('EXPE-02: link with non-existent contacto returns 404', async () => {
    const exp = await createExpediente('Caso 404');
    const res = await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: '507f1f77bcf86cd799439011', rol: 'cliente' });
    expect(res.status).toBe(404);
  });

  it('audit: link writes auditoria entry accion=link recurso=expediente with contexto', async () => {
    const contacto = await createContacto('Audit Link');
    const exp = await createExpediente('Caso audit link');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    await flushAudit();

    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'expediente', accion: 'link' })
      .sort({ timestamp: -1 });

    expect(auditDoc).toBeTruthy();
    expect(auditDoc!.recursoId.toString()).toBe(exp._id);
    expect(auditDoc!.contexto.contactoId).toBe(contacto._id);
    expect(auditDoc!.contexto.rol).toBe('cliente');
  });

  // ---------------------------------------------------------------------------
  // EXPE-02: unlink contacto
  // ---------------------------------------------------------------------------

  it('EXPE-02: unlinks a contacto', async () => {
    const contacto = await createContacto('A desvincular');
    const exp = await createExpediente('Caso unlink');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .delete(`${API}/expedientes/${exp._id}/contactos/${contacto._id}/cliente`)
      .set('Authorization', `Bearer ${token}`);

    expect([200, 204]).toContain(res.status);
    expect(res.body.contactos).toHaveLength(0);
  });

  it('EXPE-02: unlink non-existent vinculo returns 404', async () => {
    const contacto = await createContacto('Sin vinculo');
    const exp = await createExpediente('Caso unlink 404');

    const res = await request(app.getHttpServer())
      .delete(`${API}/expedientes/${exp._id}/contactos/${contacto._id}/cliente`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('EXPE-02: unlink with rol containing spaces (encodeURIComponent) works', async () => {
    const contacto = await createContacto('Cliente Principal');
    const exp = await createExpediente('Caso rol espacio');
    const rol = 'Cliente Principal';

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol })
      .expect(201);

    const res = await request(app.getHttpServer())
      .delete(
        `${API}/expedientes/${exp._id}/contactos/${contacto._id}/${encodeURIComponent(rol)}`,
      )
      .set('Authorization', `Bearer ${token}`);

    expect([200, 204]).toContain(res.status);
    expect(res.body.contactos).toHaveLength(0);
  });

  it('audit: unlink writes auditoria entry accion=unlink recurso=expediente', async () => {
    const contacto = await createContacto('Audit Unlink');
    const exp = await createExpediente('Caso audit unlink');

    await request(app.getHttpServer())
      .post(`${API}/expedientes/${exp._id}/contactos`)
      .set('Authorization', `Bearer ${token}`)
      .send({ contactoId: contacto._id, rol: 'cliente' })
      .expect(201);

    await auditoriaModel.deleteMany({});

    await request(app.getHttpServer())
      .delete(`${API}/expedientes/${exp._id}/contactos/${contacto._id}/cliente`)
      .set('Authorization', `Bearer ${token}`);

    await flushAudit();

    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'expediente', accion: 'unlink' })
      .sort({ timestamp: -1 });

    expect(auditDoc).toBeTruthy();
    expect(auditDoc!.contexto.rol).toBe('cliente');
  });

  it('audit: create writes auditoria entry accion=create recurso=expediente', async () => {
    await createExpediente('Caso audit create');
    await flushAudit();
    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'expediente', accion: 'create' })
      .sort({ timestamp: -1 });
    expect(auditDoc).toBeTruthy();
  });
});
