/**
 * PlantillasController unit tests (jest, NestJS TestingModule).
 * Covers all controller methods: list, getById, getVersions, create,
 * createFromDocx, update, declararVariable, remove.
 * SEC-06 target: controller coverage contributes to ./src/modules/plantillas/ threshold.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PlantillasController } from './plantillas.controller';
import { PlantillasService } from './plantillas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('PlantillasController', () => {
  let controller: PlantillasController;
  let service: {
    list: jest.Mock;
    getById: jest.Mock;
    getVersions: jest.Mock;
    create: jest.Mock;
    createFromDocx: jest.Mock;
    update: jest.Mock;
    declararVariable: jest.Mock;
    remove: jest.Mock;
  };

  const uid = 'uid-1';
  const id = 'some-plantilla-id';

  beforeEach(async () => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
      getVersions: jest.fn(),
      create: jest.fn(),
      createFromDocx: jest.fn(),
      update: jest.fn(),
      declararVariable: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlantillasController],
      providers: [
        { provide: PlantillasService, useValue: service },
        { provide: AuditoriaService, useValue: { writeAsync: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PlantillasController);
  });

  it('uses JwtAuthGuard at controller level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PlantillasController);
    expect(guards).toContain(JwtAuthGuard);
  });

  describe('list', () => {
    it('delegates to service.list with uid and query', async () => {
      const result = { items: [], total: 0, page: 1, limit: 10 };
      service.list.mockResolvedValue(result);
      const q = { page: 1, limit: 10 } as any;

      await expect(controller.list(uid, q)).resolves.toBe(result);
      expect(service.list).toHaveBeenCalledWith(uid, q);
    });
  });

  describe('getById', () => {
    it('delegates to service.getById with uid and id', async () => {
      const plantilla = { _id: id, nombre: 'Contrato' };
      service.getById.mockResolvedValue(plantilla);

      await expect(controller.getById(uid, id)).resolves.toBe(plantilla);
      expect(service.getById).toHaveBeenCalledWith(uid, id);
    });
  });

  describe('getVersions', () => {
    it('delegates to service.getVersions with uid and id', async () => {
      const versions = [{ version: 2 }, { version: 1 }];
      service.getVersions.mockResolvedValue(versions);

      await expect(controller.getVersions(uid, id)).resolves.toBe(versions);
      expect(service.getVersions).toHaveBeenCalledWith(uid, id);
    });
  });

  describe('create', () => {
    it('delegates to service.create with uid and dto', async () => {
      const dto = { nombre: 'Contrato', contenido: '{{expediente.nombre}}' } as any;
      const result = { _id: id, ...dto };
      service.create.mockResolvedValue(result);

      await expect(controller.create(uid, dto)).resolves.toBe(result);
      expect(service.create).toHaveBeenCalledWith(uid, dto);
    });
  });

  describe('createFromDocx', () => {
    it('delegates to service.createFromDocx with uid, nombre and buffer', async () => {
      const file = { buffer: Buffer.from('fake docx') } as Express.Multer.File;
      const result = { _id: id, nombre: 'Contrato' };
      service.createFromDocx.mockResolvedValue(result);

      await expect(controller.createFromDocx(uid, file, 'Contrato')).resolves.toBe(result);
      expect(service.createFromDocx).toHaveBeenCalledWith(uid, 'Contrato', file.buffer);
    });
  });

  describe('update', () => {
    it('delegates to service.update with uid, id and dto', async () => {
      const dto = { contenido: '{{expediente.nombre}} v2' } as any;
      const result = { _id: id, version: 2 };
      service.update.mockResolvedValue(result);

      await expect(controller.update(uid, id, dto)).resolves.toBe(result);
      expect(service.update).toHaveBeenCalledWith(uid, id, dto);
    });
  });

  describe('declararVariable', () => {
    it('delegates to service.declararVariable with uid, id and dto', async () => {
      const dto = { nombre: 'campo', tipoDato: 'texto', tipoObjeto: 'expediente' } as any;
      const result = { parametros: [] };
      service.declararVariable.mockResolvedValue(result);

      await expect(controller.declararVariable(uid, id, dto)).resolves.toBe(result);
      expect(service.declararVariable).toHaveBeenCalledWith(uid, id, dto);
    });
  });

  describe('remove', () => {
    it('delegates to service.remove with uid and id', async () => {
      const result = { _id: id, activo: false };
      service.remove.mockResolvedValue(result);

      await expect(controller.remove(uid, id)).resolves.toBe(result);
      expect(service.remove).toHaveBeenCalledWith(uid, id);
    });
  });
});
