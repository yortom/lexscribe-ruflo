/**
 * PlantillasRepository unit tests (jest, mocked Mongoose Model).
 * Covers: createFirstVersion, createNewVersion (insert-then-deactivate ordering),
 *         findActiveById, findActiveByRaiz, listActive (search branch), findVersions,
 *         softDelete, updateStoragePath.
 * SEC-06 target: >=80% line / >=70% branch coverage on plantillas.repository.ts
 */
import { PlantillasRepository } from './plantillas.repository';
import { Types } from 'mongoose';

// ─── helpers ─────────────────────────────────────────────────────────────────

const USER_ID = new Types.ObjectId().toHexString();
const RAIZ_ID = new Types.ObjectId().toHexString();
const DOC_ID = new Types.ObjectId().toHexString();
// Use a static valid 24-char hex for "not found" cases
const MISSING_ID = '000000000000000000000000';

function makeMockDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    plantillaRaizId: new Types.ObjectId(RAIZ_ID),
    version: 1,
    nombre: 'Contrato tipo',
    contenido: '{{expediente.nombre}}',
    formatoOriginal: 'pegado',
    storagePath: null,
    variablesDetectadas: [],
    clausulasReferenciadas: [],
    activo: true,
    ...overrides,
  };
}

/**
 * Build a chainable Mongoose query stub.
 * Each method returns `this` for chaining; exec() resolves to returnValue.
 */
function makeQueryStub(returnValue: unknown) {
  const stub: Record<string, jest.Mock> = {};
  const methods = ['sort', 'skip', 'limit', 'setOptions', 'exec'];
  for (const m of methods) {
    stub[m] = jest.fn().mockReturnThis();
  }
  stub['exec'] = jest.fn().mockResolvedValue(returnValue);
  return stub;
}

/**
 * Build a mocked Mongoose Model with the methods used by PlantillasRepository.
 */
function makeModel() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };
}

function buildRepo(model: ReturnType<typeof makeModel>): PlantillasRepository {
  return new PlantillasRepository(model as any);
}

// ─── createFirstVersion ────────────────────────────────────────────────────

describe('createFirstVersion', () => {
  it('creates doc then sets plantillaRaizId=own _id, returns updated doc', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const createdDoc = makeMockDoc();
    model.create.mockResolvedValue(createdDoc as any);

    const updatedDoc = makeMockDoc({ plantillaRaizId: createdDoc._id });
    const updateQuery = makeQueryStub(updatedDoc);
    model.findByIdAndUpdate.mockReturnValue(updateQuery as any);

    const result = await repo.createFirstVersion(USER_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    expect(model.create).toHaveBeenCalledTimes(1);
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      createdDoc._id,
      { $set: { plantillaRaizId: createdDoc._id } },
      expect.objectContaining({ returnDocument: 'after' }),
    );
    expect(result).toBe(updatedDoc);
  });

  it('falls back to original doc if findByIdAndUpdate returns null', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const createdDoc = makeMockDoc();
    model.create.mockResolvedValue(createdDoc as any);

    const updateQuery = makeQueryStub(null);
    model.findByIdAndUpdate.mockReturnValue(updateQuery as any);

    const result = await repo.createFirstVersion(USER_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    expect(result).toBe(createdDoc);
  });
});

// ─── createNewVersion ─────────────────────────────────────────────────────

describe('createNewVersion', () => {
  it('inserts new version BEFORE deactivating old (call order)', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const callOrder: string[] = [];

    const lastVersionQuery = makeQueryStub(makeMockDoc({ version: 1 }));
    model.findOne.mockReturnValue(lastVersionQuery as any);

    const newDoc = makeMockDoc({ version: 2 });
    model.create.mockImplementation(async () => {
      callOrder.push('create');
      return newDoc as any;
    });

    const deactivateQuery = makeQueryStub(makeMockDoc({ activo: false }));
    model.findOneAndUpdate.mockImplementation(() => {
      callOrder.push('findOneAndUpdate');
      return deactivateQuery as any;
    });

    await repo.createNewVersion(USER_ID, RAIZ_ID, {
      nombre: 'Contrato v2',
      contenido: '{{expediente.nombre}} v2',
      formatoOriginal: 'pegado',
    });

    expect(callOrder[0]).toBe('create');
    expect(callOrder[1]).toBe('findOneAndUpdate');
  });

  it('computes version as max existing version + 1', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const lastVersionQuery = makeQueryStub(makeMockDoc({ version: 3 }));
    model.findOne.mockReturnValue(lastVersionQuery as any);

    const newDoc = makeMockDoc({ version: 4 });
    model.create.mockResolvedValue(newDoc as any);

    const deactivateQuery = makeQueryStub(null);
    model.findOneAndUpdate.mockReturnValue(deactivateQuery as any);

    await repo.createNewVersion(USER_ID, RAIZ_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    const createArg = model.create.mock.calls[0][0];
    expect(createArg.version).toBe(4);
  });

  it('defaults to version 1 when no existing versions found', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const lastVersionQuery = makeQueryStub(null); // no existing versions
    model.findOne.mockReturnValue(lastVersionQuery as any);

    const newDoc = makeMockDoc({ version: 1 });
    model.create.mockResolvedValue(newDoc as any);

    const deactivateQuery = makeQueryStub(null);
    model.findOneAndUpdate.mockReturnValue(deactivateQuery as any);

    await repo.createNewVersion(USER_ID, RAIZ_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    const createArg = model.create.mock.calls[0][0];
    expect(createArg.version).toBe(1);
  });

  it('returns the newly created doc', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const lastVersionQuery = makeQueryStub(makeMockDoc({ version: 1 }));
    model.findOne.mockReturnValue(lastVersionQuery as any);

    const newDoc = makeMockDoc({ version: 2 });
    model.create.mockResolvedValue(newDoc as any);

    const deactivateQuery = makeQueryStub(null);
    model.findOneAndUpdate.mockReturnValue(deactivateQuery as any);

    const result = await repo.createNewVersion(USER_ID, RAIZ_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    expect(result).toBe(newDoc);
  });

  it('deactivate query excludes the newly inserted doc (_id: $ne)', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const lastVersionQuery = makeQueryStub(makeMockDoc({ version: 1 }));
    model.findOne.mockReturnValue(lastVersionQuery as any);

    const newDoc = makeMockDoc({ version: 2 });
    model.create.mockResolvedValue(newDoc as any);

    const deactivateQuery = makeQueryStub(null);
    model.findOneAndUpdate.mockReturnValue(deactivateQuery as any);

    await repo.createNewVersion(USER_ID, RAIZ_ID, {
      nombre: 'Contrato',
      contenido: '{{expediente.nombre}}',
      formatoOriginal: 'pegado',
    });

    const deactivateFilter = model.findOneAndUpdate.mock.calls[0][0];
    expect(deactivateFilter._id).toEqual({ $ne: newDoc._id });
    expect(deactivateFilter.activo).toBe(true);
  });
});

// ─── findActiveById ───────────────────────────────────────────────────────

describe('findActiveById', () => {
  it('returns the found document', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const doc = makeMockDoc();
    const query = makeQueryStub(doc);
    model.findOne.mockReturnValue(query as any);

    const result = await repo.findActiveById(USER_ID, DOC_ID);
    expect(result).toBe(doc);
  });

  it('returns null when document not found', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const query = makeQueryStub(null);
    model.findOne.mockReturnValue(query as any);

    const result = await repo.findActiveById(USER_ID, MISSING_ID);
    expect(result).toBeNull();
  });
});

// ─── findByIdIncludingInactive ────────────────────────────────────────────

describe('findByIdIncludingInactive', () => {
  it('returns the document and bypasses the active filter (withInactive)', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const doc = makeMockDoc();
    const query = makeQueryStub(doc);
    model.findOne.mockReturnValue(query as any);

    const result = await repo.findByIdIncludingInactive(USER_ID, DOC_ID);
    expect(result).toBe(doc);
    expect(query.setOptions).toHaveBeenCalledWith({ withInactive: true });
  });

  it('returns null when document not found', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const query = makeQueryStub(null);
    model.findOne.mockReturnValue(query as any);

    const result = await repo.findByIdIncludingInactive(USER_ID, MISSING_ID);
    expect(result).toBeNull();
  });
});

// ─── findActiveByRaiz ────────────────────────────────────────────────────

describe('findActiveByRaiz', () => {
  it('returns the active version for the given raizId', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const doc = makeMockDoc();
    const query = makeQueryStub(doc);
    model.findOne.mockReturnValue(query as any);

    const result = await repo.findActiveByRaiz(USER_ID, RAIZ_ID);
    expect(result).toBe(doc);
  });
});

// ─── listActive ───────────────────────────────────────────────────────────

describe('listActive', () => {
  it('returns items and total', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const docs = [makeMockDoc(), makeMockDoc()];
    const findQuery = makeQueryStub(docs);
    model.find.mockReturnValue(findQuery as any);

    const countQuery = makeQueryStub(2);
    model.countDocuments.mockReturnValue(countQuery as any);

    const result = await repo.listActive(USER_ID, { page: 1, limit: 10 } as any);
    expect(result.items).toBe(docs);
    expect(result.total).toBe(2);
  });

  it('adds search filter when query.search is provided', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const docs = [makeMockDoc()];
    const findQuery = makeQueryStub(docs);
    model.find.mockReturnValue(findQuery as any);

    const countQuery = makeQueryStub(1);
    model.countDocuments.mockReturnValue(countQuery as any);

    await repo.listActive(USER_ID, { page: 1, limit: 10, search: 'contrato' } as any);

    const filterArg = model.find.mock.calls[0][0];
    expect(filterArg.nombre).toEqual({ $regex: 'contrato', $options: 'i' });
  });

  it('no search filter when query.search is absent', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const findQuery = makeQueryStub([]);
    model.find.mockReturnValue(findQuery as any);

    const countQuery = makeQueryStub(0);
    model.countDocuments.mockReturnValue(countQuery as any);

    await repo.listActive(USER_ID, { page: 1, limit: 10 } as any);

    const filterArg = model.find.mock.calls[0][0];
    expect(filterArg.nombre).toBeUndefined();
  });
});

// ─── findVersions ─────────────────────────────────────────────────────────

describe('findVersions', () => {
  it('returns all versions for the given raizId', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const docs = [makeMockDoc({ version: 2 }), makeMockDoc({ version: 1 })];
    const query = makeQueryStub(docs);
    model.find.mockReturnValue(query as any);

    const result = await repo.findVersions(USER_ID, RAIZ_ID);
    expect(result).toBe(docs);
  });
});

// ─── softDelete ───────────────────────────────────────────────────────────

describe('softDelete', () => {
  it('returns the soft-deleted document', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const doc = makeMockDoc({ activo: false });
    const query = makeQueryStub(doc);
    model.findOneAndUpdate.mockReturnValue(query as any);

    const result = await repo.softDelete(USER_ID, DOC_ID);
    expect(result).toBe(doc);

    const updateFilter = model.findOneAndUpdate.mock.calls[0][1];
    expect(updateFilter.$set).toEqual(
      expect.objectContaining({ activo: false }),
    );
  });

  it('returns null when document not found', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const query = makeQueryStub(null);
    model.findOneAndUpdate.mockReturnValue(query as any);

    const result = await repo.softDelete(USER_ID, MISSING_ID);
    expect(result).toBeNull();
  });
});

// ─── updateStoragePath ────────────────────────────────────────────────────

describe('updateStoragePath', () => {
  it('returns updated doc with storagePath set', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const updatedDoc = makeMockDoc({ storagePath: 'plantillas/abc/file.docx' });
    const query = makeQueryStub(updatedDoc);
    model.findByIdAndUpdate.mockReturnValue(query as any);

    const result = await repo.updateStoragePath(DOC_ID, 'plantillas/abc/file.docx');
    expect(result).toBe(updatedDoc);

    const updateArg = model.findByIdAndUpdate.mock.calls[0][1];
    expect(updateArg.$set.storagePath).toBe('plantillas/abc/file.docx');
  });

  it('returns null when document not found', async () => {
    const model = makeModel();
    const repo = buildRepo(model);

    const query = makeQueryStub(null);
    model.findByIdAndUpdate.mockReturnValue(query as any);

    const result = await repo.updateStoragePath(MISSING_ID, 'some/path.docx');
    expect(result).toBeNull();
  });
});
