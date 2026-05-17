import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContactosController } from '../contactos.controller';
import { ContactosService } from '../contactos.service';

describe('ContactosController', () => {
  let controller: ContactosController;
  let service: {
    list: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const usuarioId = 'usuario-1';
  const contactoId = 'contacto-1';

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactosController],
      providers: [
        { provide: ContactosService, useValue: service },
        { provide: AuditoriaService, useValue: { writeAsync: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ContactosController);
  });

  it('uses JwtAuthGuard at controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ContactosController);

    expect(guards).toContain(JwtAuthGuard);
  });

  it('delegates list requests to ContactosService', async () => {
    const result = { items: [], total: 0, page: 1, limit: 20 };
    const query = { page: 1, limit: 20 };
    service.list.mockResolvedValue(result);

    await expect(controller.list(usuarioId, query)).resolves.toBe(result);
    expect(service.list).toHaveBeenCalledWith(usuarioId, query);
  });

  it('delegates detail requests to ContactosService', async () => {
    const result = { _id: contactoId, nombre: 'Ana' };
    service.getById.mockResolvedValue(result);

    await expect(controller.getById(usuarioId, contactoId)).resolves.toBe(
      result,
    );
    expect(service.getById).toHaveBeenCalledWith(usuarioId, contactoId);
  });

  it('delegates create requests to ContactosService', async () => {
    const dto = {
      tipo: 'fisica' as const,
      tipologia: 'cliente' as const,
      nombre: 'Ana',
      parametros: {},
    };
    const result = { _id: contactoId, ...dto };
    service.create.mockResolvedValue(result);

    await expect(controller.create(usuarioId, dto)).resolves.toBe(result);
    expect(service.create).toHaveBeenCalledWith(usuarioId, dto);
  });

  it('delegates update requests to ContactosService', async () => {
    const dto = { nombre: 'Ana Updated' };
    const result = { _id: contactoId, nombre: 'Ana Updated' };
    service.update.mockResolvedValue(result);

    await expect(controller.update(usuarioId, contactoId, dto)).resolves.toBe(
      result,
    );
    expect(service.update).toHaveBeenCalledWith(usuarioId, contactoId, dto);
  });

  it('delegates delete requests to ContactosService', async () => {
    const result = { _id: contactoId, activo: false };
    service.remove.mockResolvedValue(result);

    await expect(controller.remove(usuarioId, contactoId)).resolves.toBe(
      result,
    );
    expect(service.remove).toHaveBeenCalledWith(usuarioId, contactoId);
  });
});
