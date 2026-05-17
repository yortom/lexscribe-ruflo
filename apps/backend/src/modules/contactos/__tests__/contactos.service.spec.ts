import { ConflictError, NotFoundError } from '../../../common/errors';
import { EsquemasService } from '../../esquemas/esquemas.service';
import { ContactosRepository } from '../contactos.repository';
import { ContactosService } from '../contactos.service';

describe('ContactosService', () => {
  let service: ContactosService;
  let repo: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let esquemasService: { addParametro: jest.Mock };

  const usuarioId = 'usuario-1';
  const contactoId = 'contacto-1';

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };
    esquemasService = { addParametro: jest.fn() };
    service = new ContactosService(
      repo as unknown as ContactosRepository,
      esquemasService as unknown as EsquemasService,
    );
  });

  it('lists contactos using repository pagination result', async () => {
    const items = [{ nombre: 'Ana' }];
    repo.findAll.mockResolvedValue({ items, total: 1 });

    await expect(
      service.list(usuarioId, { page: 1, limit: 20 }),
    ).resolves.toEqual({ items, total: 1, page: 1, limit: 20 });
    expect(repo.findAll).toHaveBeenCalledWith(usuarioId, {
      page: 1,
      limit: 20,
    });
  });

  it('returns contacto detail with empty expedientesVinculados stub', async () => {
    repo.findById.mockResolvedValue({
      toObject: () => ({ _id: contactoId, nombre: 'Ana' }),
    });

    await expect(service.getById(usuarioId, contactoId)).resolves.toEqual({
      _id: contactoId,
      nombre: 'Ana',
      expedientesVinculados: [],
    });
  });

  it('throws NotFoundError when contacto detail does not exist', async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.getById(usuarioId, contactoId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('creates a contacto and returns the repository result', async () => {
    const contacto = { _id: contactoId, nombre: 'Ana' };
    repo.create.mockResolvedValue(contacto);

    await expect(
      service.create(usuarioId, {
        tipo: 'fisica',
        tipologia: 'cliente',
        nombre: 'Ana',
        parametros: {},
      }),
    ).resolves.toBe(contacto);
  });

  it('translates duplicate NIF persistence errors to ConflictError', async () => {
    repo.create.mockRejectedValue(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    );

    await expect(
      service.create(usuarioId, {
        tipo: 'fisica',
        tipologia: 'cliente',
        nombre: 'Ana',
        documentacionFiscal: '12345678A',
        parametros: {},
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('registers dynamic parametros when creating a contacto', async () => {
    repo.create.mockResolvedValue({ _id: contactoId });

    await service.create(usuarioId, {
      tipo: 'fisica',
      tipologia: 'cliente',
      nombre: 'Ana',
      parametros: { profesion: 'Abogada', aniosExp: 5 },
    });

    expect(esquemasService.addParametro).toHaveBeenCalledTimes(2);
    expect(esquemasService.addParametro).toHaveBeenCalledWith(
      usuarioId,
      'contacto',
      { nombre: 'profesion', tipoDato: 'texto', obligatorio: false },
    );
    expect(esquemasService.addParametro).toHaveBeenCalledWith(
      usuarioId,
      'contacto',
      { nombre: 'aniosExp', tipoDato: 'texto', obligatorio: false },
    );
  });

  it('updates a contacto and registers provided parametros', async () => {
    const updated = { _id: contactoId, nombre: 'Ana Updated' };
    repo.update.mockResolvedValue(updated);

    await expect(
      service.update(usuarioId, contactoId, {
        nombre: 'Ana Updated',
        parametros: { profesion: 'Abogada' },
      }),
    ).resolves.toBe(updated);

    expect(esquemasService.addParametro).toHaveBeenCalledWith(
      usuarioId,
      'contacto',
      { nombre: 'profesion', tipoDato: 'texto', obligatorio: false },
    );
  });

  it('throws NotFoundError when updating a missing contacto', async () => {
    repo.update.mockResolvedValue(null);

    await expect(
      service.update(usuarioId, contactoId, { nombre: 'Ana Updated' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('soft deletes a contacto through the repository', async () => {
    const deleted = { _id: contactoId, activo: false };
    repo.softDelete.mockResolvedValue(deleted);

    await expect(service.remove(usuarioId, contactoId)).resolves.toBe(deleted);
    expect(repo.softDelete).toHaveBeenCalledWith(usuarioId, contactoId);
  });

  it('throws NotFoundError when removing a missing contacto', async () => {
    repo.softDelete.mockResolvedValue(null);

    await expect(service.remove(usuarioId, contactoId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
