/**
 * FacturacionRepository unit tests (TDD RED — written before implementation).
 * Covers:
 *   - getTotales() builds aggregate with activo:true in $match (FAC-05, Pitfall 1)
 *   - getTotales() rounds importe to 2 decimals (Pitfall 6 — floating-point)
 *   - getTotales() defaults missing status subtotals to 0
 *   - listByExpediente() filter includes activo:true and sorts by fecha:-1
 *   - softDelete() sets activo:false
 */
import { FacturacionRepository } from '../facturacion.repository';

const FAKE_UID = '507f1f77bcf86cd799439011';
const FAKE_EXP_ID = '507f1f77bcf86cd799439022';
const FAKE_ID = '507f1f77bcf86cd799439099';

/** Build a mock Mongoose model with chainable find and aggregate methods */
function makeModel() {
  const execFn = jest.fn().mockResolvedValue([]);
  const countExecFn = jest.fn().mockResolvedValue(0);
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: execFn,
  };
  const aggChain = { exec: jest.fn().mockResolvedValue([]) };
  return {
    create: jest.fn(),
    findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    find: jest.fn().mockReturnValue(chain),
    countDocuments: jest.fn().mockReturnValue({ exec: countExecFn }),
    findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    aggregate: jest.fn().mockReturnValue(aggChain),
    chain,
    execFn,
    countExecFn,
    aggChain,
  };
}

describe('FacturacionRepository', () => {
  let repo: FacturacionRepository;
  let model: ReturnType<typeof makeModel>;

  beforeEach(() => {
    model = makeModel();
    repo = new FacturacionRepository(model as any);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getTotales()', () => {
    it('FAC-05: aggregate pipeline has activo:true in $match (Pitfall 1)', async () => {
      model.aggChain.exec.mockResolvedValue([]);
      await repo.getTotales(FAKE_UID, FAKE_EXP_ID);

      expect(model.aggregate).toHaveBeenCalledTimes(1);
      const pipeline = model.aggregate.mock.calls[0][0] as any[];
      const match = pipeline.find((s: any) => s.$match);
      expect(match.$match).toMatchObject({ activo: true });
    });

    it('FAC-05: returns correct subtotals and total when statuses present', async () => {
      model.aggChain.exec.mockResolvedValue([
        { _id: 'pendiente', subtotal: 1.10 },
        { _id: 'facturado', subtotal: 2.20 },
      ]);

      const result = await repo.getTotales(FAKE_UID, FAKE_EXP_ID);

      expect(result).toEqual({ total: 3.3, pendiente: 1.1, facturado: 2.2, cobrado: 0 });
    });

    it('Pitfall 6: rounds importe sum to 2 decimals to avoid IEEE 754 drift', async () => {
      // 1.10 + 2.20 = 3.3000000000000003 without rounding
      model.aggChain.exec.mockResolvedValue([
        { _id: 'pendiente', subtotal: 1.10 },
        { _id: 'facturado', subtotal: 2.20 },
      ]);

      const result = await repo.getTotales(FAKE_UID, FAKE_EXP_ID);

      expect(result.total).toBe(3.3);
      expect(result.pendiente).toBe(1.1);
      expect(result.facturado).toBe(2.2);
    });

    it('defaults missing statuses to 0', async () => {
      model.aggChain.exec.mockResolvedValue([
        { _id: 'cobrado', subtotal: 500 },
      ]);

      const result = await repo.getTotales(FAKE_UID, FAKE_EXP_ID);

      expect(result.pendiente).toBe(0);
      expect(result.facturado).toBe(0);
      expect(result.cobrado).toBe(500);
      expect(result.total).toBe(500);
    });

    it('returns all zeros when no facturas exist', async () => {
      model.aggChain.exec.mockResolvedValue([]);

      const result = await repo.getTotales(FAKE_UID, FAKE_EXP_ID);

      expect(result).toEqual({ total: 0, pendiente: 0, facturado: 0, cobrado: 0 });
    });
  });

  describe('listByExpediente()', () => {
    it('FAC-01: filter includes activo:true', async () => {
      model.countExecFn.mockResolvedValue(0);
      model.execFn.mockResolvedValue([]);

      await repo.listByExpediente(FAKE_UID, FAKE_EXP_ID, { expedienteId: FAKE_EXP_ID, page: 1, limit: 100 });

      const findArg = model.find.mock.calls[0][0];
      expect(findArg).toMatchObject({ activo: true });
    });

    it('FAC-01: sorts by fecha:-1 (descending)', async () => {
      model.countExecFn.mockResolvedValue(0);
      model.execFn.mockResolvedValue([]);

      await repo.listByExpediente(FAKE_UID, FAKE_EXP_ID, { expedienteId: FAKE_EXP_ID, page: 1, limit: 100 });

      expect(model.chain.sort).toHaveBeenCalledWith({ fecha: -1 });
    });

    it('returns items and total', async () => {
      const fakeDocs = [{ _id: FAKE_ID, concepto: 'Honorarios' }];
      model.execFn.mockResolvedValue(fakeDocs);
      model.countExecFn.mockResolvedValue(1);

      const result = await repo.listByExpediente(FAKE_UID, FAKE_EXP_ID, { expedienteId: FAKE_EXP_ID, page: 1, limit: 100 });

      expect(result.items).toBe(fakeDocs);
      expect(result.total).toBe(1);
    });
  });

  describe('softDelete()', () => {
    it('FAC-04: sets activo:false and fechaInactivacion', async () => {
      const fakeDoc = { _id: FAKE_ID, activo: false };
      model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(fakeDoc) });

      const result = await repo.softDelete(FAKE_UID, FAKE_ID);

      expect(model.findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [, update] = model.findOneAndUpdate.mock.calls[0];
      expect(update.$set).toMatchObject({ activo: false });
      expect(result).toBe(fakeDoc);
    });
  });
});
