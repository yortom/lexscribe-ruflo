import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ContactosRepository } from '../contactos.repository';
import { Contacto } from '../schemas/contacto.schema';

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
