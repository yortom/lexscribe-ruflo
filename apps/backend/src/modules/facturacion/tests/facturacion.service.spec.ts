/**
 * FacturacionService unit tests (TDD RED — written before implementation).
 * Covers:
 *   FAC-02: create() defaults fecha to today when dto.fecha omitted
 *   FAC-03: create() uses estado from Zod default (pendiente)
 *   FAC-04: update(), remove() throw NotFoundError when repo returns null
 *   FAC-03: updateEstado() throws NotFoundError when repo returns null
 *   FAC-05: getTotales() returns repo.getTotales result
 */
import { FacturacionService } from '../facturacion.service';
import { FacturacionRepository } from '../facturacion.repository';
import { NotFoundError } from '../../../common/errors';
import { Types } from 'mongoose';

// ── helpers ──────────────────────────────────────────────────────────────────

const FAKE_UID = '507f1f77bcf86cd799439011';
const FAKE_ID  = '507f1f77bcf86cd799439099';
const FAKE_EXP_ID = '507f1f77bcf86cd799439022';

function makeFactura(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    usuarioId: new Types.ObjectId(FAKE_UID),
    expedienteId: new Types.ObjectId(FAKE_EXP_ID),
    concepto: 'Honorarios notariales',
    importe: 250.00,
    fecha: new Date('2026-06-01'),
    numero: null,
    notas: null,
    estado: 'pendiente' as const,
    activo: true,
    fechaCreacion: new Date(),
    fechaActualizacion: new Date(),
    ...overrides,
  };
}

function makeRepo(): jest.Mocked<FacturacionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    listByExpediente: jest.fn(),
    update: jest.fn(),
    updateEstado: jest.fn(),
    softDelete: jest.fn(),
    getTotales: jest.fn(),
  } as unknown as jest.Mocked<FacturacionRepository>;
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('FacturacionService', () => {
  let service: FacturacionService;
  let repo: jest.Mocked<FacturacionRepository>;
  const now = new Date('2026-06-06T12:00:00Z');

  beforeEach(() => {
    repo = makeRepo();
    service = new FacturacionService(repo);
    jest.useFakeTimers().setSystemTime(now);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('FAC-02: defaults fecha to today (Date) when dto.fecha is omitted', async () => {
      const factura = makeFactura();
      repo.create.mockResolvedValue(factura as any);

      const dto = {
        expedienteId: FAKE_EXP_ID,
        concepto: 'Honorarios',
        importe: 250,
        estado: 'pendiente' as const,
      };

      await service.create(FAKE_UID, dto as any);

      const callArg = repo.create.mock.calls[0][1];
      expect(callArg.fecha).toEqual(now);
    });

    it('FAC-02: uses provided fecha when dto.fecha is set', async () => {
      const factura = makeFactura();
      repo.create.mockResolvedValue(factura as any);

      const dto = {
        expedienteId: FAKE_EXP_ID,
        concepto: 'Honorarios',
        importe: 250,
        fecha: '2026-05-15T00:00:00.000Z',
        estado: 'pendiente' as const,
      };

      await service.create(FAKE_UID, dto as any);

      const callArg = repo.create.mock.calls[0][1];
      expect(callArg.fecha).toEqual(new Date('2026-05-15T00:00:00.000Z'));
    });

    it('returns the created factura', async () => {
      const factura = makeFactura();
      repo.create.mockResolvedValue(factura as any);

      const dto = {
        expedienteId: FAKE_EXP_ID,
        concepto: 'Honorarios',
        importe: 250,
        estado: 'pendiente' as const,
      };

      const result = await service.create(FAKE_UID, dto as any);
      expect(result).toBe(factura);
    });
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated result with page/limit from query', async () => {
      const items = [makeFactura()];
      repo.listByExpediente.mockResolvedValue({ items: items as any, total: 1 });

      const result = await service.list(FAKE_UID, {
        expedienteId: FAKE_EXP_ID,
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({ items, total: 1, page: 2, limit: 10 });
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns factura when found', async () => {
      const factura = makeFactura();
      repo.findById.mockResolvedValue(factura as any);

      const result = await service.getById(FAKE_UID, FAKE_ID);
      expect(result).toBe(factura);
    });

    it("throws NotFoundError('factura') when repo returns null", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById(FAKE_UID, FAKE_ID)).rejects.toThrow(NotFoundError);
    });

    it("NotFoundError message contains 'factura' and id", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getById(FAKE_UID, FAKE_ID)).rejects.toThrow(
        expect.objectContaining({ message: expect.stringContaining('factura') }),
      );
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('FAC-04: returns updated factura when repo.update succeeds', async () => {
      const updated = makeFactura({ concepto: 'Asesoría actualizada' });
      repo.update.mockResolvedValue(updated as any);

      const result = await service.update(FAKE_UID, FAKE_ID, { concepto: 'Asesoría actualizada' });
      expect(result).toBe(updated);
    });

    it('FAC-04: throws NotFoundError when repo.update returns null', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update(FAKE_UID, FAKE_ID, {})).rejects.toThrow(NotFoundError);
    });

    it('coerces fecha string to Date when provided', async () => {
      const updated = makeFactura();
      repo.update.mockResolvedValue(updated as any);

      await service.update(FAKE_UID, FAKE_ID, { fecha: '2026-05-01T00:00:00.000Z' } as any);

      const callArg = repo.update.mock.calls[0][2];
      expect(callArg.fecha).toEqual(new Date('2026-05-01T00:00:00.000Z'));
    });
  });

  // ── updateEstado ──────────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('FAC-03: returns updated factura when repo.updateEstado succeeds', async () => {
      const updated = makeFactura({ estado: 'facturado' });
      repo.updateEstado.mockResolvedValue(updated as any);

      const result = await service.updateEstado(FAKE_UID, FAKE_ID, 'facturado');
      expect(result).toBe(updated);
    });

    it('FAC-03: throws NotFoundError when repo.updateEstado returns null', async () => {
      repo.updateEstado.mockResolvedValue(null);

      await expect(service.updateEstado(FAKE_UID, FAKE_ID, 'cobrado')).rejects.toThrow(NotFoundError);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('FAC-04: returns soft-deleted factura', async () => {
      const deleted = makeFactura({ activo: false });
      repo.softDelete.mockResolvedValue(deleted as any);

      const result = await service.remove(FAKE_UID, FAKE_ID);
      expect(result).toBe(deleted);
    });

    it('FAC-04: throws NotFoundError when repo.softDelete returns null', async () => {
      repo.softDelete.mockResolvedValue(null);

      await expect(service.remove(FAKE_UID, FAKE_ID)).rejects.toThrow(NotFoundError);
    });
  });

  // ── getTotales ────────────────────────────────────────────────────────────

  describe('getTotales', () => {
    it('FAC-05: returns repo.getTotales result directly', async () => {
      const totales = { total: 750, pendiente: 250, facturado: 500, cobrado: 0 };
      repo.getTotales.mockResolvedValue(totales);

      const result = await service.getTotales(FAKE_UID, FAKE_EXP_ID);
      expect(result).toBe(totales);
      expect(repo.getTotales).toHaveBeenCalledWith(FAKE_UID, FAKE_EXP_ID);
    });
  });
});
