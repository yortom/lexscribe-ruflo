/**
 * EventosRepository unit tests.
 * Covers:
 *   - list() with soloCalendario=true adds mostrarEnCalendario:true to filter (CAL-03)
 *   - list() with fechaDesde/fechaHasta builds fechaInicio range
 *   - softDeleteByDocumentoId calls updateMany with correct filter (CAL-05)
 *   - countByDocumentoId returns count of active events for FL-9 pre-check
 */
import { EventosRepository } from '../eventos.repository';

const FAKE_UID = '507f1f77bcf86cd799439011';
const FAKE_DOC_ID = '507f1f77bcf86cd799439099';
const FAKE_EXP_ID = '507f1f77bcf86cd799439012';

/** Build a mock Mongoose model with chainable find and other methods */
function makeModel() {
  const execFn = jest.fn().mockResolvedValue([]);
  const countExecFn = jest.fn().mockResolvedValue(0);
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: execFn,
  };
  return {
    create: jest.fn(),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue(chain),
    countDocuments: jest.fn().mockReturnValue({ exec: countExecFn }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
    chain,
    execFn,
    countExecFn,
  };
}

describe('EventosRepository', () => {
  let repo: EventosRepository;
  let model: ReturnType<typeof makeModel>;

  beforeEach(() => {
    model = makeModel();
    repo = new EventosRepository(model as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list()', () => {
    it('soloCalendario=true adds mostrarEnCalendario:true to filter (CAL-03)', async () => {
      model.countExecFn.mockResolvedValue(0);
      model.execFn.mockResolvedValue([]);

      await repo.list(FAKE_UID, { page: 1, limit: 50, soloCalendario: true });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg).toMatchObject({ mostrarEnCalendario: true });
    });

    it('soloCalendario=false does NOT add mostrarEnCalendario to filter', async () => {
      await repo.list(FAKE_UID, { page: 1, limit: 50, soloCalendario: false });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg.mostrarEnCalendario).toBeUndefined();
    });

    it('fechaDesde and fechaHasta build $gte/$lte range on fechaInicio', async () => {
      const fechaDesde = '2026-06-01T00:00:00.000Z';
      const fechaHasta = '2026-06-30T23:59:59.999Z';
      await repo.list(FAKE_UID, { page: 1, limit: 50, fechaDesde, fechaHasta });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg.fechaInicio).toMatchObject({
        $gte: new Date(fechaDesde),
        $lte: new Date(fechaHasta),
      });
    });

    it('expedienteId filter added when provided', async () => {
      await repo.list(FAKE_UID, { page: 1, limit: 50, expedienteId: FAKE_EXP_ID });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg.expedienteId).toBeDefined();
    });

    it('documentoId filter added when provided', async () => {
      await repo.list(FAKE_UID, { page: 1, limit: 50, documentoId: FAKE_DOC_ID });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg.documentoId).toBeDefined();
    });
  });

  describe('softDeleteByDocumentoId()', () => {
    it('calls updateMany with documentoId + usuarioId + activo:true filter (CAL-05)', async () => {
      await repo.softDeleteByDocumentoId(FAKE_UID, FAKE_DOC_ID);

      expect(model.updateMany).toHaveBeenCalledTimes(1);
      const [filter, update] = model.updateMany.mock.calls[0];
      expect(filter).toMatchObject({ activo: true });
      expect(update).toMatchObject({ $set: { activo: false } });
    });

    it('returns modifiedCount from updateMany result', async () => {
      model.updateMany.mockResolvedValue({ modifiedCount: 3 });
      const count = await repo.softDeleteByDocumentoId(FAKE_UID, FAKE_DOC_ID);
      expect(count).toBe(3);
    });
  });

  describe('countByDocumentoId()', () => {
    it('returns count of active events for documentoId (FL-9 pre-check)', async () => {
      model.countExecFn.mockResolvedValue(5);
      const result = await repo.countByDocumentoId(FAKE_UID, FAKE_DOC_ID);
      expect(result).toBe(5);

      const countArg = model.countDocuments.mock.calls[0][0];
      expect(countArg).toMatchObject({ activo: true });
    });
  });
});
