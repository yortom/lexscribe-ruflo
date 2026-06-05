/**
 * DocumentosRepository unit tests (jest, mock Mongoose Model).
 * Covers: create, findById, listByExpediente, softDelete.
 * Pattern: contactos.repository.spec.ts — MISSING_ID avoids BSONError in not-found branches.
 */
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DocumentosRepository } from '../documentos.repository';
import { Documento } from '../schemas/documento.schema';

/** Valid 24-char hex that doesn't exist — avoids BSONError from toObjectId(). */
const MISSING_ID = '000000000000000000000000';

type QueryMock = {
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  exec: jest.Mock;
};

function createQueryMock(result: unknown): QueryMock {
  const q: QueryMock = {
    sort: jest.fn(),
    skip: jest.fn(),
    limit: jest.fn(),
    exec: jest.fn().mockResolvedValue(result),
  };
  q.sort.mockReturnValue(q);
  q.skip.mockReturnValue(q);
  q.limit.mockReturnValue(q);
  return q;
}

describe('DocumentosRepository', () => {
  let repository: DocumentosRepository;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    countDocuments: jest.Mock;
  };

  const usuarioId = new Types.ObjectId().toString();
  const documentoId = new Types.ObjectId().toString();
  const expedienteId = new Types.ObjectId().toString();

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentosRepository,
        { provide: getModelToken(Documento.name), useValue: model },
      ],
    }).compile();

    repository = module.get(DocumentosRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('persists with usuarioId and expedienteId converted to ObjectId and returns the doc', async () => {
      const docId = new Types.ObjectId();
      const expected = {
        _id: docId,
        nombre: 'Contrato 2026',
        tipo: 'generado',
        formato: 'docx',
        storagePath: 'documentos/generados/abc/contrato.docx',
      };
      model.create.mockResolvedValue(expected);

      const data = {
        _id: docId,
        expedienteId,
        nombre: 'Contrato 2026',
        tipo: 'generado' as const,
        storagePath: 'documentos/generados/abc/contrato.docx',
        formato: 'docx' as const,
      };

      const result = await repository.create(usuarioId, data);

      expect(result).toBe(expected);
      expect(model.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Contrato 2026',
          usuarioId: expect.any(Types.ObjectId),
          expedienteId: expect.any(Types.ObjectId),
        }),
      );
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('filters by _id + usuarioId + activo:true and returns the doc', async () => {
      const doc = { _id: documentoId, nombre: 'Contrato', activo: true };
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });

      const result = await repository.findById(usuarioId, documentoId);

      expect(result).toBe(doc);
      expect(model.findOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
        usuarioId: expect.any(Types.ObjectId),
        activo: true,
      });
    });

    it('returns null for MISSING_ID (not found)', async () => {
      model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.findById(usuarioId, MISSING_ID);

      expect(result).toBeNull();
    });
  });

  // ── listByExpediente ──────────────────────────────────────────────────────

  describe('listByExpediente', () => {
    it('filters by expedienteId, sorts fechaCreacion:-1, applies skip/limit and returns {items,total}', async () => {
      const docs = [
        { _id: new Types.ObjectId(), nombre: 'Doc A' },
        { _id: new Types.ObjectId(), nombre: 'Doc B' },
      ];
      const findQuery = createQueryMock(docs);
      const countQuery = { exec: jest.fn().mockResolvedValue(2) };
      model.find.mockReturnValue(findQuery);
      model.countDocuments.mockReturnValue(countQuery);

      const result = await repository.listByExpediente(usuarioId, expedienteId, { page: 2, limit: 5 });

      expect(result).toEqual({ items: docs, total: 2 });
      expect(findQuery.sort).toHaveBeenCalledWith({ fechaCreacion: -1 });
      // page=2, limit=5 → skip=5
      expect(findQuery.skip).toHaveBeenCalledWith(5);
      expect(findQuery.limit).toHaveBeenCalledWith(5);
    });

    it('builds filter with usuarioId, expedienteId and activo:true', async () => {
      const findQuery = createQueryMock([]);
      model.find.mockReturnValue(findQuery);
      model.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      await repository.listByExpediente(usuarioId, expedienteId, { page: 1, limit: 10 });

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: expect.any(Types.ObjectId),
          expedienteId: expect.any(Types.ObjectId),
          activo: true,
        }),
      );
      expect(model.countDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: expect.any(Types.ObjectId),
          expedienteId: expect.any(Types.ObjectId),
          activo: true,
        }),
      );
    });

    it('returns empty list when no documents exist', async () => {
      model.find.mockReturnValue(createQueryMock([]));
      model.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(0) });

      const result = await repository.listByExpediente(usuarioId, expedienteId, { page: 1, limit: 10 });

      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  // ── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets activo:false and fechaInactivacion, uses returnDocument:after', async () => {
      const deleted = { _id: documentoId, activo: false, fechaInactivacion: new Date() };
      model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(deleted) });

      const result = await repository.softDelete(usuarioId, documentoId);

      expect(result).toBe(deleted);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: expect.any(Types.ObjectId),
          usuarioId: expect.any(Types.ObjectId),
        },
        {
          $set: {
            activo: false,
            fechaInactivacion: expect.any(Date),
          },
        },
        { returnDocument: 'after' },
      );
    });

    it('returns null for MISSING_ID (document not found)', async () => {
      model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      const result = await repository.softDelete(usuarioId, MISSING_ID);

      expect(result).toBeNull();
    });
  });
});
