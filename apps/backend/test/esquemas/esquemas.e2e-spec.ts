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
import { Esquema } from '../../src/modules/esquemas/schemas/esquema.schema';
import { Auditoria } from '../../src/modules/auditoria/schemas/auditoria.schema';

describe('AUTH-08 esquemas', () => {
  let app: INestApplication;
  let usuarioModel: Model<any>;
  let esquemaModel: Model<any>;
  let auditoriaModel: Model<any>;
  let bearerToken: string;

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
    esquemaModel = moduleRef.get<Model<any>>(getModelToken(Esquema.name));
    auditoriaModel = moduleRef.get<Model<any>>(getModelToken(Auditoria.name));

    // Create seed user
    const passwordHash = await argon2.hash('P@ssw0rd1234', {
      type: argon2.argon2id,
    });
    const usuario = await usuarioModel.create({
      email: 'esquemas-test@lexscribe.local',
      nombre: 'Esquemas Test',
      rol: 'admin',
      passwordHash,
      refreshTokens: [],
    });

    // Create esquema for expediente (simulating seed)
    await esquemaModel.create({
      usuarioId: usuario._id,
      tipoObjeto: 'expediente',
      parametros: [],
    });

    // Login to get bearer token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'esquemas-test@lexscribe.local', password: 'P@ssw0rd1234' });

    bearerToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await usuarioModel.deleteMany({});
    await esquemaModel.deleteMany({});
    await auditoriaModel.deleteMany({});
    await app.close();
  });

  it('GET /esquemas/expediente returns 200 with empty parametros after seed', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/esquemas/expediente')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tipoObjeto).toBe('expediente');
    expect(Array.isArray(res.body.parametros)).toBe(true);
    expect(res.body.parametros).toHaveLength(0);
  });

  it('POST /esquemas/expediente/parametros adds a parameter', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/esquemas/expediente/parametros')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ nombre: 'honorariosBase', tipoDato: 'numero' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.parametros).toHaveLength(1);
    expect(res.body.parametros[0].nombre).toBe('honorariosBase');
  });

  it('POST same parameter (idempotent) keeps parametros.length === 1', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/esquemas/expediente/parametros')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ nombre: 'honorariosBase', tipoDato: 'numero' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.parametros).toHaveLength(1);
  });

  it('verifies audit record written after POST parametros', async () => {
    // Wait for setImmediate-based async write to complete
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setTimeout(r, 50));

    const auditDoc = await auditoriaModel
      .findOne({ recurso: 'esquema' })
      .sort({ timestamp: -1 });

    expect(auditDoc).toBeTruthy();
    expect(auditDoc.accion).toBe('create');
    expect(auditDoc.recurso).toBe('esquema');
  });

  it('POST same nombre with different tipoDato returns 409 CONFLICT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/esquemas/expediente/parametros')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ nombre: 'honorariosBase', tipoDato: 'texto' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.message).toMatch(/already exists with different tipoDato/);
  });

  it('GET /esquemas/factura (invalid tipoObjeto) returns 400 VALIDATION', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/esquemas/factura')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION');
  });

  it('DELETE /esquemas/expediente/parametros/:nombre returns 501 NOT_IMPLEMENTED', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/esquemas/expediente/parametros/honorariosBase')
      .set('Authorization', `Bearer ${bearerToken}`);

    expect(res.status).toBe(501);
    expect(res.body.code).toBe('NOT_IMPLEMENTED');
  });

  it('returns 401 without Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/esquemas/expediente');

    expect(res.status).toBe(401);
  });
});
