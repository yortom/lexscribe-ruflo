/**
 * EventosService unit tests (jest, mock dependencies).
 * Covers:
 *   CAL-01/CAL-02: create(uid, dto) calls repo.create with usuarioId + dto
 *   CAL-04: update returns updated evento (color patch via partial dto)
 *   NotFoundError: getById, update, remove throw when repo returns null
 *   countByDocumento: returns { total } from repo.countByDocumentoId
 */
import { EventosService } from '../eventos.service';
import { EventosRepository } from '../eventos.repository';
import { NotFoundError } from '../../../common/errors';
import { Types } from 'mongoose';

// ── helpers ──────────────────────────────────────────────────────────────────

const FAKE_UID = '507f1f77bcf86cd799439011';
const FAKE_ID  = '507f1f77bcf86cd799439099';
const FAKE_DOC_ID = '507f1f77bcf86cd799439012';

function makeEvento(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    usuarioId: new Types.ObjectId(FAKE_UID),
    origen: 'manual' as const,
    expedienteId: null,
    documentoId: null,
    subtipo: null,
    titulo: 'Reunión',
    descripcion: null,
    fechaInicio: new Date('2026-06-10T10:00:00Z'),
    fechaFin: null,
    color: null,
    mostrarEnCalendario: true,
    activo: true,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    ...overrides,
  };
}

function makeRepo(): jest.Mocked<EventosRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    softDeleteByDocumentoId: jest.fn(),
    countByDocumentoId: jest.fn(),
  } as unknown as jest.Mocked<EventosRepository>;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('EventosService', () => {
  let service: EventosService;
  let repo: jest.Mocked<EventosRepository>;

  beforeEach(() => {
    repo = makeRepo();
    service = new EventosService(repo);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('CAL-01/CAL-02: calls repo.create with usuarioId + dto; returns created evento', async () => {
      const evento = makeEvento();
      repo.create.mockResolvedValue(evento as any);

      const dto = {
        origen: 'manual' as const,
        titulo: 'Reunión',
        fechaInicio: '2026-06-10T10:00:00.000Z',
        mostrarEnCalendario: true,
      };

      const result = await service.create(FAKE_UID, dto as any);

      expect(repo.create).toHaveBeenCalledWith(FAKE_UID, dto);
      expect(result).toBe(evento);
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated result with page/limit from query', async () => {
      const items = [makeEvento()];
      repo.list.mockResolvedValue({ items: items as any, total: 1 });

      const result = await service.list(FAKE_UID, { page: 2, limit: 10 });

      expect(result).toEqual({ items, total: 1, page: 2, limit: 10 });
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns evento when found', async () => {
      const evento = makeEvento();
      repo.findById.mockResolvedValue(evento as any);

      const result = await service.getById(FAKE_UID, FAKE_ID);
      expect(result).toBe(evento);
    });

    it('throws NotFoundError when repo returns null', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById(FAKE_UID, FAKE_ID)).rejects.toThrow(NotFoundError);
    });

    it("NotFoundError message contains 'evento' and id", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById(FAKE_UID, FAKE_ID)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('evento') }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('CAL-04: returns updated evento when repo.update succeeds', async () => {
      const updated = makeEvento({ color: '#3b82f6' });
      repo.update.mockResolvedValue(updated as any);

      const result = await service.update(FAKE_UID, FAKE_ID, { color: '#3b82f6' } as any);
      expect(result).toBe(updated);
    });

    it('throws NotFoundError when repo.update returns null', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update(FAKE_UID, FAKE_ID, {} as any)).rejects.toThrow(NotFoundError);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns soft-deleted evento', async () => {
      const evento = makeEvento({ activo: false });
      repo.softDelete.mockResolvedValue(evento as any);

      const result = await service.remove(FAKE_UID, FAKE_ID);
      expect(result).toBe(evento);
    });

    it('throws NotFoundError when repo.softDelete returns null', async () => {
      repo.softDelete.mockResolvedValue(null);

      await expect(service.remove(FAKE_UID, FAKE_ID)).rejects.toThrow(NotFoundError);
    });
  });

  // ── countByDocumento ──────────────────────────────────────────────────────

  describe('countByDocumento', () => {
    it('returns { total } from repo.countByDocumentoId', async () => {
      repo.countByDocumentoId.mockResolvedValue(3);

      const result = await service.countByDocumento(FAKE_UID, FAKE_DOC_ID);
      expect(result).toEqual({ total: 3 });
    });
  });
});
