import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import mongoose, { Model, Types } from 'mongoose';
import { ContactosRepository } from '../contactos.repository';
import { Contacto, ContactoSchema } from '../schemas/contacto.schema';

type QueryMock = {
  skip: jest.Mock;
  limit: jest.Mock;
  sort: jest.Mock;
  exec: jest.Mock;
};

function createQueryMock(result: unknown): QueryMock {
  return {
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  };
}

describe('ContactosRepository', () => {
  let repository: ContactosRepository;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    countDocuments: jest.Mock;
  };

  const usuarioId = new Types.ObjectId().toString();
  const contactoId = new Types.ObjectId().toString();

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContactosRepository, { provide: getModelToken(Contacto.name), useValue: model }],
    }).compile();

    repository = module.get(ContactosRepository);
  });

  it('creates a contacto with the usuarioId converted to ObjectId', async () => {
    const doc = { _id: contactoId, nombre: 'Ana Lopez', activo: true };
    model.create.mockResolvedValue(doc);

    await expect(
      repository.create(usuarioId, {
        tipo: 'fisica',
        tipologia: 'cliente',
        nombre: 'Ana Lopez',
        parametros: {},
      }),
    ).resolves.toBe(doc);

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Ana Lopez',
        usuarioId: expect.any(Types.ObjectId),
      }),
    );
  });

  it('finds a contacto by usuarioId and id', async () => {
    const doc = { _id: contactoId, nombre: 'Ana Lopez' };
    const query = { exec: jest.fn().mockResolvedValue(doc) };
    model.findOne.mockReturnValue(query);

    await expect(repository.findById(usuarioId, contactoId)).resolves.toBe(doc);

    expect(model.findOne).toHaveBeenCalledWith({
      _id: expect.any(Types.ObjectId),
      usuarioId: expect.any(Types.ObjectId),
    });
  });

  it('returns null when a contacto is not found by id', async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    await expect(repository.findById(usuarioId, contactoId)).resolves.toBeNull();
  });

  it('lists contactos with pagination and total count', async () => {
    const docs = [{ nombre: 'A' }, { nombre: 'B' }];
    const findQuery = createQueryMock(docs);
    const countQuery = { exec: jest.fn().mockResolvedValue(2) };
    model.find.mockReturnValue(findQuery);
    model.countDocuments.mockReturnValue(countQuery);

    await expect(repository.findAll(usuarioId, { page: 2, limit: 10 })).resolves.toEqual({
      items: docs,
      total: 2,
    });

    expect(findQuery.skip).toHaveBeenCalledWith(10);
    expect(findQuery.limit).toHaveBeenCalledWith(10);
    expect(findQuery.sort).toHaveBeenCalledWith({ fechaCreacion: -1 });
  });

  it('includes tipologia and search filters when listing contactos', async () => {
    model.find.mockReturnValue(createQueryMock([]));
    model.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    await repository.findAll(usuarioId, {
      page: 1,
      limit: 20,
      tipologia: 'cliente',
      search: 'Ana',
    });

    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({
        tipologia: 'cliente',
        $or: expect.arrayContaining([
          { nombre: { $regex: 'Ana', $options: 'i' } },
          { documentacionFiscalHash: expect.any(String) },
        ]),
      }),
    );
    expect(model.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        tipologia: 'cliente',
        $or: expect.any(Array),
      }),
    );
  });

  it('updates a contacto and returns the updated document', async () => {
    const updated = { _id: contactoId, nombre: 'Ana Updated' };
    model.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updated),
    });

    await expect(repository.update(usuarioId, contactoId, { nombre: 'Ana Updated' })).resolves.toBe(
      updated,
    );

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId), usuarioId: expect.any(Types.ObjectId) },
      { $set: { nombre: 'Ana Updated' } },
      { returnDocument: 'after' },
    );
  });

  it('soft deletes a contacto by marking it inactive', async () => {
    const deleted = { _id: contactoId, activo: false };
    model.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(deleted),
    });

    await expect(repository.softDelete(usuarioId, contactoId)).resolves.toBe(deleted);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: expect.any(Types.ObjectId), usuarioId: expect.any(Types.ObjectId) },
      {
        $set: {
          activo: false,
          fechaInactivacion: expect.any(Date),
        },
      },
      { returnDocument: 'after' },
    );
  });
});

describe('ContactoSchema transforms and pre-hooks', () => {
  // Use a unique model name per test suite to avoid OverwriteModelError
  const MODEL_NAME = `ContactoTest_${Date.now()}`;
  let ContactoModel: Model<any>;

  beforeAll(() => {
    ContactoModel = mongoose.model(MODEL_NAME, ContactoSchema);
  });

  afterAll(() => {
    mongoose.deleteModel(MODEL_NAME);
  });

  it('decryptContactoPii: returns null for null PII fields via toObject transform', () => {
    const doc = new ContactoModel({
      usuarioId: new Types.ObjectId(),
      tipo: 'fisica',
      tipologia: 'cliente',
      nombre: 'Test User',
      documentacionFiscal: null,
      documentoIdentidad: null,
    });

    const plain = doc.toObject() as Record<string, unknown>;
    expect(plain.documentacionFiscal).toBeNull();
    expect(plain.documentoIdentidad).toBeNull();
  });

  it('decryptContactoPii: returns plaintext values unchanged via toObject transform', () => {
    const doc = new ContactoModel({
      usuarioId: new Types.ObjectId(),
      tipo: 'fisica',
      tipologia: 'cliente',
      nombre: 'Test User',
      documentacionFiscal: 'plaintext-no-prefix',
      documentoIdentidad: 'another-plaintext',
    });

    const plain = doc.toObject() as Record<string, unknown>;
    expect(plain.documentacionFiscal).toBe('plaintext-no-prefix');
    expect(plain.documentoIdentidad).toBe('another-plaintext');
  });

  it('toObject transform: returns null for empty-string PII fields', () => {
    const doc = new ContactoModel({
      usuarioId: new Types.ObjectId(),
      tipo: 'juridica',
      tipologia: 'interesado',
      nombre: 'Empresa SL',
      documentacionFiscal: '',
    });
    const plain = doc.toObject() as Record<string, unknown>;
    expect(plain.documentacionFiscal).toBeNull();
  });

  it('pre-findOneAndUpdate hook: runs encryptContactoPii on $set with documentacionFiscal', () => {
    // Extract Lexscribe's own pre-findOneAndUpdate hook by introspecting schema internals.
    // Mongoose 8 registers hooks in kareem; the schema's own hook is synchronous (no next arg).
    type HookEntry = { fn: (this: unknown) => void };
    type SchemaInternals = {
      s: { hooks: { _pres: Map<string, HookEntry[]> } };
    };
    const hooksMap = (ContactoSchema as unknown as SchemaInternals).s?.hooks?._pres;
    const fauHooks = hooksMap?.get('findOneAndUpdate') ?? [];
    expect(fauHooks.length).toBeGreaterThan(0);

    let currentUpdate: Record<string, unknown> = {
      $set: { documentacionFiscal: '12345678A', documentoIdentidad: 'X1234567' },
    };
    const fakeQuery = {
      getUpdate: () => currentUpdate,
      setUpdate: (u: Record<string, unknown>) => { currentUpdate = u; },
    };

    // The Lexscribe hook is the one whose source uses getUpdate/setUpdate.
    // We call each hook synchronously; Mongoose internal hooks may throw on fake context
    // — we catch those and continue.
    for (const hook of fauHooks) {
      const fn = (hook as unknown as HookEntry)?.fn;
      if (typeof fn !== 'function') continue;
      // Skip timestamp hook (it accesses this.model which is not set)
      if (fn.name === '_setTimestampsOnUpdate') continue;
      try {
        fn.call(fakeQuery);
      } catch {
        // Ignore Mongoose internal errors on fake context
      }
    }

    // Lexscribe's hook encrypts documentacionFiscal and sets documentacionFiscalHash
    const updatedSet = (currentUpdate.$set ?? currentUpdate) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(updatedSet, 'documentacionFiscalHash')).toBe(true);
  });

  it('pre-findOneAndUpdate hook: skips encryption when update has no PII fields', () => {
    type HookEntry = { fn: (this: unknown) => void };
    type SchemaInternals = {
      s: { hooks: { _pres: Map<string, HookEntry[]> } };
    };
    const hooksMap = (ContactoSchema as unknown as SchemaInternals).s?.hooks?._pres;
    const fauHooks = hooksMap?.get('findOneAndUpdate') ?? [];

    let currentUpdate: Record<string, unknown> = {
      $set: { nombre: 'Only Name Update' },
    };
    const fakeQuery = {
      getUpdate: () => currentUpdate,
      setUpdate: (u: Record<string, unknown>) => { currentUpdate = u; },
    };

    for (const hook of fauHooks) {
      const fn = (hook as unknown as HookEntry)?.fn;
      if (typeof fn !== 'function') continue;
      if (fn.name === '_setTimestampsOnUpdate') continue;
      try { fn.call(fakeQuery); } catch { /* ignore */ }
    }

    // documentacionFiscalHash should NOT be set when documentacionFiscal is absent from $set
    const updatedSet = (currentUpdate.$set ?? currentUpdate) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(updatedSet, 'documentacionFiscalHash')).toBe(false);
  });

  it('pre-findOneAndUpdate hook: returns early when update is null', () => {
    type HookEntry = { fn: (this: unknown) => void };
    type SchemaInternals = {
      s: { hooks: { _pres: Map<string, HookEntry[]> } };
    };
    const hooksMap = (ContactoSchema as unknown as SchemaInternals).s?.hooks?._pres;
    const fauHooks = hooksMap?.get('findOneAndUpdate') ?? [];

    const setUpdateSpy = jest.fn();
    const fakeQuery = {
      getUpdate: () => null,
      setUpdate: setUpdateSpy,
    };

    for (const hook of fauHooks) {
      const fn = (hook as unknown as HookEntry)?.fn;
      if (typeof fn !== 'function') continue;
      if (fn.name === '_setTimestampsOnUpdate') continue;
      try { fn.call(fakeQuery); } catch { /* ignore */ }
    }

    // setUpdate should NOT be called when getUpdate() returns null
    expect(setUpdateSpy).not.toHaveBeenCalled();
  });

  it('schema has both save and findOneAndUpdate pre-hooks registered', () => {
    type SchemaInternals = {
      s: { hooks: { _pres: Map<string, unknown[]> } };
    };
    const hooks = (ContactoSchema as unknown as SchemaInternals).s?.hooks?._pres;
    expect(hooks?.has('save')).toBe(true);
    expect(hooks?.has('findOneAndUpdate')).toBe(true);
  });
});
