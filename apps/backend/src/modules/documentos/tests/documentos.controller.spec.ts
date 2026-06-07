/**
 * DocumentosController unit tests (jest, NestJS TestingModule).
 * Verifies that each endpoint delegates to DocumentosService with the correct arguments.
 * Pattern: plantillas.controller.spec.ts — mock the service, override JwtAuthGuard.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { DocumentosController } from '../documentos.controller';
import { DocumentosService } from '../documentos.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ValidationError } from '../../../common/errors';

describe('DocumentosController', () => {
  let controller: DocumentosController;
  let service: {
    generar: jest.Mock;
    uploadExistente: jest.Mock;
    list: jest.Mock;
    getById: jest.Mock;
    getDownloadUrl: jest.Mock;
    remove: jest.Mock;
  };

  const uid = 'uid-test-1';
  const expedienteId = '507f1f77bcf86cd799439012';
  const docId = '507f1f77bcf86cd799439099';

  beforeEach(async () => {
    service = {
      generar: jest.fn(),
      uploadExistente: jest.fn(),
      list: jest.fn(),
      getById: jest.fn(),
      getDownloadUrl: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentosController],
      providers: [
        { provide: DocumentosService, useValue: service },
        { provide: AuditoriaService, useValue: { writeAsync: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(DocumentosController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── guard ────────────────────────────────────────────────────────────────

  it('uses JwtAuthGuard at controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DocumentosController);
    expect(guards).toContain(JwtAuthGuard);
  });

  // ── POST generar ──────────────────────────────────────────────────────────

  describe('generar', () => {
    it('delegates to service.generar(uid, expedienteId, dto)', async () => {
      const dto = {
        plantillaId: '507f1f77bcf86cd799439013',
        nombre: 'Contrato prueba',
        valores: { expediente: {}, contacto: {}, clausula: {}, fecha: {} },
        asignacionesRol: [],
        camposNuevos: [],
      } as any;
      const expected = { _id: docId, nombre: dto.nombre };
      service.generar.mockResolvedValue(expected);

      const result = await controller.generar(uid, expedienteId, dto);

      expect(service.generar).toHaveBeenCalledWith(uid, expedienteId, dto);
      expect(result).toBe(expected);
    });
  });

  // ── POST upload ───────────────────────────────────────────────────────────

  describe('upload', () => {
    it('delegates to service.uploadExistente(uid, expedienteId, {file, nombre})', async () => {
      const file = {
        originalname: 'contrato.docx',
        buffer: Buffer.from('docx-content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as Express.Multer.File;
      const nombre = 'Contrato firmado';
      const expected = { _id: docId, nombre, tipo: 'subido' };
      service.uploadExistente.mockResolvedValue(expected);

      const result = await controller.upload(uid, expedienteId, file, nombre);

      expect(service.uploadExistente).toHaveBeenCalledWith(uid, expedienteId, { file, nombre });
      expect(result).toBe(expected);
    });

    it('throws ValidationError when nombre is empty', async () => {
      const file = { originalname: 'doc.docx', buffer: Buffer.from('x') } as Express.Multer.File;

      expect(() => controller.upload(uid, expedienteId, file, '')).toThrow(ValidationError);
      expect(service.uploadExistente).not.toHaveBeenCalled();
    });

    it('throws ValidationError when nombre is whitespace only', async () => {
      const file = { originalname: 'doc.docx', buffer: Buffer.from('x') } as Express.Multer.File;

      expect(() => controller.upload(uid, expedienteId, file, '   ')).toThrow(ValidationError);
      expect(service.uploadExistente).not.toHaveBeenCalled();
    });
  });

  // ── GET list ──────────────────────────────────────────────────────────────

  describe('list', () => {
    it('delegates to service.list(uid, expedienteId, q)', async () => {
      const q = { page: 1, limit: 10 } as any;
      const expected = { items: [], total: 0, page: 1, limit: 10 };
      service.list.mockResolvedValue(expected);

      const result = await controller.list(uid, expedienteId, q);

      expect(service.list).toHaveBeenCalledWith(uid, expedienteId, q);
      expect(result).toBe(expected);
    });

    it('throws ValidationError when expedienteId is missing', () => {
      const q = { page: 1, limit: 10 } as any;

      expect(() => controller.list(uid, undefined as any, q)).toThrow(ValidationError);
      expect(service.list).not.toHaveBeenCalled();
    });
  });

  // ── GET :id ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('delegates to service.getById(uid, id)', async () => {
      const expected = { _id: docId, nombre: 'Contrato' };
      service.getById.mockResolvedValue(expected);

      const result = await controller.getById(uid, docId);

      expect(service.getById).toHaveBeenCalledWith(uid, docId);
      expect(result).toBe(expected);
    });
  });

  // ── GET :id/download ──────────────────────────────────────────────────────

  describe('download', () => {
    it('delegates to service.getDownloadUrl(uid, id)', async () => {
      const expected = { url: 'https://minio.local/presigned?token=xyz' };
      service.getDownloadUrl.mockResolvedValue(expected);

      const result = await controller.download(uid, docId);

      expect(service.getDownloadUrl).toHaveBeenCalledWith(uid, docId);
      expect(result).toBe(expected);
    });
  });

  // ── DELETE :id ────────────────────────────────────────────────────────────

  describe('remove', () => {
    it("delegates to service.remove(uid, id, 'conservar') by default (FL-9)", async () => {
      const expected = { _id: docId, activo: false };
      service.remove.mockResolvedValue(expected);

      const result = await controller.remove(uid, docId);

      expect(service.remove).toHaveBeenCalledWith(uid, docId, 'conservar');
      expect(result).toBe(expected);
    });
  });
});
