/**
 * PlantillasService unit tests (jest, mock dependencies).
 * Covers: detectarYValidar (F-030b), create, createFromDocx, update (PLAN-06),
 *         declararVariable (PLAN-04), getById/getVersions/remove, Pitfall 4 guard.
 * SEC-06 target: >=80% line / >=70% branch coverage on plantillas.service.ts
 */
import { PlantillasService } from './plantillas.service';
import { PlantillasRepository } from './plantillas.repository';
import { EsquemasService } from '../esquemas/esquemas.service';
import { StorageService } from '../../common/storage/storage.service';
import { NotFoundError, ValidationError } from '../../common/errors';
import * as conversion from './conversion';
import { Types } from 'mongoose';

jest.mock('./conversion');

// ─── helpers ─────────────────────────────────────────────────────────────────

function makePlantilla(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    plantillaRaizId: new Types.ObjectId(),
    nombre: 'Contrato tipo',
    contenido: '{{expediente.nombre}}',
    formatoOriginal: 'pegado' as const,
    storagePath: null,
    variablesDetectadas: [],
    clausulasReferenciadas: [],
    version: 1,
    activo: true,
    ...overrides,
  };
}

function makeRepo(): jest.Mocked<PlantillasRepository> {
  return {
    createFirstVersion: jest.fn(),
    createNewVersion: jest.fn(),
    findActiveById: jest.fn(),
    findByIdIncludingInactive: jest.fn(),
    findActiveByRaiz: jest.fn(),
    listActive: jest.fn(),
    findVersions: jest.fn(),
    softDelete: jest.fn(),
    updateStoragePath: jest.fn(),
  } as unknown as jest.Mocked<PlantillasRepository>;
}

function makeEsquemas(): jest.Mocked<EsquemasService> {
  return {
    addParametro: jest.fn(),
    findByUsuarioAndTipo: jest.fn(),
    removeParametro: jest.fn(),
  } as unknown as jest.Mocked<EsquemasService>;
}

function makeStorage(): jest.Mocked<StorageService> {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    getPresignedUrl: jest.fn(),
  } as unknown as jest.Mocked<StorageService>;
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('PlantillasService', () => {
  let service: PlantillasService;
  let repo: jest.Mocked<PlantillasRepository>;
  let esquemas: jest.Mocked<EsquemasService>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(() => {
    repo = makeRepo();
    esquemas = makeEsquemas();
    storage = makeStorage();
    service = new PlantillasService(repo, esquemas, storage);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates first version with detected variables', async () => {
      const plantilla = makePlantilla();
      repo.createFirstVersion.mockResolvedValue(plantilla as any);

      const dto = {
        nombre: 'Contrato tipo',
        contenido: '{{expediente.nombre}} {{contacto.cliente.nif}}',
        formatoOriginal: 'pegado' as const,
      };

      const result = await service.create('uid-1', dto);

      expect(repo.createFirstVersion).toHaveBeenCalledTimes(1);
      const callArg = repo.createFirstVersion.mock.calls[0][1];
      // variablesDetectadas should contain 2 variables
      expect(callArg.variablesDetectadas).toHaveLength(2);
      expect(result).toBe(plantilla);
    });

    it('throws ValidationError and does NOT call repo when contenido has unknown tipo', async () => {
      const dto = {
        nombre: 'Contrato tipo',
        contenido: '{{contrato.algo}} (línea 1)',
        formatoOriginal: 'pegado' as const,
      };

      await expect(service.create('uid-1', dto)).rejects.toThrow(ValidationError);
      expect(repo.createFirstVersion).not.toHaveBeenCalled();
    });

    it('ValidationError message names the variable + line (F-030b)', async () => {
      const dto = {
        nombre: 'Contrato',
        contenido: '{{contrato.algo}}',
        formatoOriginal: 'pegado' as const,
      };

      try {
        await service.create('uid-1', dto);
        fail('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        expect((err as ValidationError).message).toContain('{{contrato.algo}}');
        expect((err as ValidationError).message).toContain('línea 1');
      }
    });

    it('passes formatoOriginal=pegado when not provided', async () => {
      const plantilla = makePlantilla();
      repo.createFirstVersion.mockResolvedValue(plantilla as any);

      await service.create('uid-1', { nombre: 'A', contenido: '{{expediente.numero}}' } as any);

      expect(repo.createFirstVersion.mock.calls[0][1].formatoOriginal).toBe('pegado');
    });
  });

  // ── createFromDocx ──────────────────────────────────────────────────────────

  describe('createFromDocx', () => {
    it('extracts text, detects vars, creates version and uploads to MinIO', async () => {
      const docx = conversion as jest.Mocked<typeof conversion>;
      docx.docxToTexto = jest.fn().mockResolvedValue('{{expediente.nombre}}');

      const newDoc = makePlantilla({ _id: new Types.ObjectId() });
      repo.createFirstVersion.mockResolvedValue(newDoc as any);
      const updatedDoc = makePlantilla({ storagePath: 'plantillas/abc/file.docx' });
      repo.updateStoragePath.mockResolvedValue(updatedDoc as any);

      const buffer = Buffer.from('fake docx bytes');
      const result = await service.createFromDocx('uid-1', 'Contrato', buffer);

      expect(docx.docxToTexto).toHaveBeenCalledWith(buffer);
      expect(repo.createFirstVersion).toHaveBeenCalledTimes(1);
      expect(storage.putObject).toHaveBeenCalledTimes(1);
      const [key] = storage.putObject.mock.calls[0];
      expect(key).toContain('plantillas/');
      expect(key).toContain('.docx');
      expect(repo.updateStoragePath).toHaveBeenCalledTimes(1);
      expect(result).toBe(updatedDoc);
    });

    it('returns original doc if updateStoragePath returns null', async () => {
      const docx = conversion as jest.Mocked<typeof conversion>;
      docx.docxToTexto = jest.fn().mockResolvedValue('{{expediente.nombre}}');

      const newDoc = makePlantilla();
      repo.createFirstVersion.mockResolvedValue(newDoc as any);
      repo.updateStoragePath.mockResolvedValue(null);

      const result = await service.createFromDocx('uid-1', 'Contrato', Buffer.from('x'));
      expect(result).toBe(newDoc);
    });

    it('throws ValidationError if docx content has unknown tipo', async () => {
      const docx = conversion as jest.Mocked<typeof conversion>;
      docx.docxToTexto = jest.fn().mockResolvedValue('{{contrato.algo}}');

      await expect(
        service.createFromDocx('uid-1', 'Contrato', Buffer.from('x')),
      ).rejects.toThrow(ValidationError);

      expect(repo.createFirstVersion).not.toHaveBeenCalled();
    });
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated result from repo', async () => {
      const items = [makePlantilla()];
      repo.listActive.mockResolvedValue({ items: items as any, total: 1 });

      const query = { page: 1, limit: 10 };
      const result = await service.list('uid-1', query as any);

      expect(result.items).toBe(items);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns the plantilla when found', async () => {
      const plantilla = makePlantilla();
      repo.findActiveById.mockResolvedValue(plantilla as any);

      const result = await service.getById('uid-1', 'some-id');
      expect(result).toBe(plantilla);
    });

    it('throws NotFoundError when plantilla does not exist', async () => {
      repo.findActiveById.mockResolvedValue(null);

      await expect(service.getById('uid-1', 'bad-id')).rejects.toThrow(NotFoundError);
    });
  });

  // ── getVersions ────────────────────────────────────────────────────────────

  describe('getVersions', () => {
    it('delegates to repo.findVersions', async () => {
      const versions = [makePlantilla({ version: 2 }), makePlantilla({ version: 1 })];
      repo.findVersions.mockResolvedValue(versions as any);

      const result = await service.getVersions('uid-1', 'raiz-id');
      expect(result).toBe(versions);
      expect(repo.findVersions).toHaveBeenCalledWith('uid-1', 'raiz-id');
    });
  });

  // ── update (PLAN-06) ───────────────────────────────────────────────────────

  describe('update', () => {
    it('calls repo.createNewVersion when contenido is valid (PLAN-06)', async () => {
      const current = makePlantilla({ plantillaRaizId: new Types.ObjectId() });
      repo.findActiveById.mockResolvedValue(current as any);
      const newVersion = makePlantilla({ version: 2 });
      repo.createNewVersion.mockResolvedValue(newVersion as any);

      const dto = { contenido: '{{expediente.nombre}} actualizado', nombre: 'Nuevo nombre' };
      const result = await service.update('uid-1', 'id-1', dto as any);

      expect(repo.createNewVersion).toHaveBeenCalledTimes(1);
      expect(result).toBe(newVersion);
    });

    it('throws NotFoundError when plantilla not found for update', async () => {
      repo.findActiveById.mockResolvedValue(null);

      await expect(
        service.update('uid-1', 'bad-id', { contenido: '{{expediente.nombre}}' } as any),
      ).rejects.toThrow(NotFoundError);

      expect(repo.createNewVersion).not.toHaveBeenCalled();
    });

    it('throws ValidationError if updated contenido has unknown tipo', async () => {
      const current = makePlantilla();
      repo.findActiveById.mockResolvedValue(current as any);

      await expect(
        service.update('uid-1', 'id-1', { contenido: '{{contrato.algo}}' } as any),
      ).rejects.toThrow(ValidationError);

      expect(repo.createNewVersion).not.toHaveBeenCalled();
    });

    it('uses current.nombre when dto.nombre is undefined', async () => {
      const current = makePlantilla({ nombre: 'Original' });
      repo.findActiveById.mockResolvedValue(current as any);
      const newVersion = makePlantilla({ version: 2 });
      repo.createNewVersion.mockResolvedValue(newVersion as any);

      await service.update('uid-1', 'id-1', { contenido: '{{expediente.numero}}' } as any);

      const callArg = repo.createNewVersion.mock.calls[0][2];
      expect(callArg.nombre).toBe('Original');
    });
  });

  // ── declararVariable (PLAN-04) ─────────────────────────────────────────────

  describe('declararVariable', () => {
    it('calls esquemas.addParametro with {nombre, tipoDato, obligatorio:false} for expediente', async () => {
      const plantilla = makePlantilla();
      repo.findByIdIncludingInactive.mockResolvedValue(plantilla as any);
      const schemaResult = { parametros: [] };
      esquemas.addParametro.mockResolvedValue(schemaResult as any);

      const dto = {
        nombre: 'numeroExpediente',
        tipoDato: 'texto' as const,
        tipoObjeto: 'expediente' as const,
      };

      const result = await service.declararVariable('uid-1', 'id-1', dto);

      expect(esquemas.addParametro).toHaveBeenCalledWith('uid-1', 'expediente', {
        nombre: 'numeroExpediente',
        tipoDato: 'texto',
        obligatorio: false,
      });
      expect(result).toBe(schemaResult);
    });

    it('calls esquemas.addParametro for contacto tipoObjeto', async () => {
      const plantilla = makePlantilla();
      repo.findByIdIncludingInactive.mockResolvedValue(plantilla as any);
      esquemas.addParametro.mockResolvedValue({} as any);

      const dto = {
        nombre: 'nif',
        tipoDato: 'texto' as const,
        tipoObjeto: 'contacto' as const,
      };

      await service.declararVariable('uid-1', 'id-1', dto);

      expect(esquemas.addParametro).toHaveBeenCalledWith('uid-1', 'contacto', expect.any(Object));
    });

    it('throws ValidationError for tipoObjeto=clausula (Pitfall 4 guard)', async () => {
      const plantilla = makePlantilla();
      repo.findByIdIncludingInactive.mockResolvedValue(plantilla as any);

      const dto = {
        nombre: 'titulo',
        tipoDato: 'texto' as const,
        tipoObjeto: 'clausula' as unknown as 'expediente',
      };

      await expect(service.declararVariable('uid-1', 'id-1', dto)).rejects.toThrow(ValidationError);
      expect(esquemas.addParametro).not.toHaveBeenCalled();
    });

    it('throws ValidationError for tipoObjeto=fecha (Pitfall 4 guard)', async () => {
      const plantilla = makePlantilla();
      repo.findByIdIncludingInactive.mockResolvedValue(plantilla as any);

      const dto = {
        nombre: 'inicio',
        tipoDato: 'fecha' as const,
        tipoObjeto: 'fecha' as unknown as 'expediente',
      };

      await expect(service.declararVariable('uid-1', 'id-1', dto)).rejects.toThrow(ValidationError);
      expect(esquemas.addParametro).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when plantilla not found', async () => {
      repo.findByIdIncludingInactive.mockResolvedValue(null);

      const dto = {
        nombre: 'campo',
        tipoDato: 'texto' as const,
        tipoObjeto: 'expediente' as const,
      };

      await expect(service.declararVariable('uid-1', 'bad-id', dto)).rejects.toThrow(NotFoundError);
      expect(esquemas.addParametro).not.toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns the soft-deleted plantilla', async () => {
      const deleted = makePlantilla({ activo: false });
      repo.softDelete.mockResolvedValue(deleted as any);

      const result = await service.remove('uid-1', 'id-1');
      expect(result).toBe(deleted);
    });

    it('throws NotFoundError when softDelete returns null', async () => {
      repo.softDelete.mockResolvedValue(null);

      await expect(service.remove('uid-1', 'bad-id')).rejects.toThrow(NotFoundError);
    });
  });
});
