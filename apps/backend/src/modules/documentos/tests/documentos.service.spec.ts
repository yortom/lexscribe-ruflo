/**
 * DocumentosService unit tests (jest, mock dependencies).
 * Covers:
 *   Test 1 (DOC-02): generar llama linkContacto por cada asignación antes de delegar a GenerationService
 *   Test 2 (DOC-02): ConflictError en linkContacto NO se propaga (ya vinculado = ok)
 *   Test 3 (DOC-07): generar devuelve documento de GenerationService con datosCongelados intacto
 *   Test 4 (DOC-06): uploadExistente con ext no permitida lanza ValidationError; no llama putObject
 *   Test 5 (DOC-05): getDownloadUrl llama storage.getPresignedUrl(storagePath, 300) y devuelve {url}
 */
import { Types } from 'mongoose';
import { DocumentosService } from '../documentos.service';
import { DocumentosRepository } from '../documentos.repository';
import { GenerationService } from '../generation/generation.service';
import { StorageService } from '../../../common/storage/storage.service';
import { ExpedientesService } from '../../expedientes/expedientes.service';
import { EventosRepository } from '../../eventos/eventos.repository';
import { ConflictError, ValidationError, NotFoundError } from '../../../common/errors';

// ── helpers ──────────────────────────────────────────────────────────────────

const FAKE_UID = '507f1f77bcf86cd799439011';
const FAKE_EXPEDIENTE_ID = '507f1f77bcf86cd799439012';

function makeDocumento(overrides: Record<string, unknown> = {}) {
  return {
    _id: new Types.ObjectId(),
    nombre: 'Contrato prueba',
    tipo: 'generado' as const,
    storagePath: 'documentos/generados/abc/contrato.docx',
    formato: 'docx' as const,
    datosCongelados: { expediente: { nombre: 'Caso 1' }, contacto: {}, clausula: {}, fecha: {} },
    ...overrides,
  };
}

function makeGenerationService(): jest.Mocked<GenerationService> {
  return {
    generar: jest.fn(),
  } as unknown as jest.Mocked<GenerationService>;
}

function makeDocumentosRepo(): jest.Mocked<DocumentosRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    listByExpediente: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<DocumentosRepository>;
}

function makeStorage(): jest.Mocked<StorageService> {
  return {
    putObject: jest.fn().mockImplementation((key: string) => Promise.resolve(key)),
    getPresignedUrl: jest.fn().mockResolvedValue('https://minio-mock/presigned'),
  } as unknown as jest.Mocked<StorageService>;
}

function makeExpedientesService(): jest.Mocked<ExpedientesService> {
  return {
    linkContacto: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ExpedientesService>;
}

function makeEventosRepository(): jest.Mocked<EventosRepository> {
  return {
    softDeleteByDocumentoId: jest.fn().mockResolvedValue(0),
  } as unknown as jest.Mocked<EventosRepository>;
}

function makeMulderFile(originalname: string, content = 'test'): Express.Multer.File {
  return {
    originalname,
    buffer: Buffer.from(content),
    mimetype: 'application/octet-stream',
    size: content.length,
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('DocumentosService', () => {
  let service: DocumentosService;
  let generation: jest.Mocked<GenerationService>;
  let repo: jest.Mocked<DocumentosRepository>;
  let storage: jest.Mocked<StorageService>;
  let expedientes: jest.Mocked<ExpedientesService>;
  let eventosRepo: jest.Mocked<EventosRepository>;

  beforeEach(() => {
    generation = makeGenerationService();
    repo = makeDocumentosRepo();
    storage = makeStorage();
    expedientes = makeExpedientesService();
    eventosRepo = makeEventosRepository();

    service = new DocumentosService(
      generation,
      repo,
      storage,
      expedientes as any, // forwardRef'd in real module
      eventosRepo,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── Test 1 (DOC-02): linkContacto llamado por cada asignación ───────────────

  describe('generar', () => {
    it('Test 1 (DOC-02): calls ExpedientesService.linkContacto for each asignacionRol before delegating', async () => {
      const documento = makeDocumento();
      generation.generar.mockResolvedValue(documento as any);

      const dto = {
        plantillaId: '507f1f77bcf86cd799439013',
        nombre: 'Mi contrato',
        valores: { expediente: {}, contacto: {}, clausula: {}, fecha: {} },
        asignacionesRol: [
          { contactoId: '507f1f77bcf86cd799439020', rol: 'vendedor' },
          { contactoId: '507f1f77bcf86cd799439021', rol: 'comprador' },
        ],
        camposNuevos: [],
      };

      await service.generar(FAKE_UID, FAKE_EXPEDIENTE_ID, dto as any);

      expect(expedientes.linkContacto).toHaveBeenCalledTimes(2);
      expect(expedientes.linkContacto).toHaveBeenNthCalledWith(
        1,
        FAKE_UID,
        FAKE_EXPEDIENTE_ID,
        { contactoId: '507f1f77bcf86cd799439020', rol: 'vendedor' },
      );
      expect(expedientes.linkContacto).toHaveBeenNthCalledWith(
        2,
        FAKE_UID,
        FAKE_EXPEDIENTE_ID,
        { contactoId: '507f1f77bcf86cd799439021', rol: 'comprador' },
      );
      // GenerationService still called
      expect(generation.generar).toHaveBeenCalledTimes(1);
    });

    // ── Test 2 (DOC-02): ConflictError tolerado ─────────────────────────────

    it('Test 2 (DOC-02): ConflictError from linkContacto does NOT propagate — continues with generation', async () => {
      const documento = makeDocumento();
      generation.generar.mockResolvedValue(documento as any);

      // linkContacto lanza ConflictError (ya vinculado)
      expedientes.linkContacto.mockRejectedValue(
        new ConflictError('Contacto ya vinculado con rol "vendedor" a este expediente'),
      );

      const dto = {
        plantillaId: '507f1f77bcf86cd799439013',
        nombre: 'Mi contrato',
        valores: { expediente: {}, contacto: {}, clausula: {}, fecha: {} },
        asignacionesRol: [{ contactoId: '507f1f77bcf86cd799439020', rol: 'vendedor' }],
        camposNuevos: [],
      };

      // Should NOT throw
      const result = await service.generar(FAKE_UID, FAKE_EXPEDIENTE_ID, dto as any);

      expect(result).toBe(documento);
      expect(generation.generar).toHaveBeenCalledTimes(1);
    });

    // ── Test 3 (DOC-07): datosCongelados intacto ─────────────────────────────

    it('Test 3 (DOC-07): returns document from GenerationService with datosCongelados intact', async () => {
      const datosCongelados = { expediente: { nombre: 'Caso Test' }, contacto: {}, clausula: {}, fecha: {} };
      const documento = makeDocumento({ datosCongelados });
      generation.generar.mockResolvedValue(documento as any);

      const dto = {
        plantillaId: '507f1f77bcf86cd799439013',
        nombre: 'Mi contrato',
        valores: { expediente: {}, contacto: {}, clausula: {}, fecha: {} },
        asignacionesRol: [],
        camposNuevos: [],
      };

      const result = await service.generar(FAKE_UID, FAKE_EXPEDIENTE_ID, dto as any);

      // Service does NOT mutate datosCongelados
      expect(result.datosCongelados).toBe(datosCongelados);
      expect(result.datosCongelados).toEqual(datosCongelados);
    });
  });

  // ── Test 4 (DOC-06): uploadExistente valida extensión ────────────────────

  describe('uploadExistente', () => {
    it('DOC-06: throws ValidationError (not TypeError 500) when file is missing; does NOT call putObject', async () => {
      await expect(
        service.uploadExistente(FAKE_UID, FAKE_EXPEDIENTE_ID, {
          file: undefined as unknown as Express.Multer.File,
          nombre: 'Sin archivo',
        }),
      ).rejects.toThrow(ValidationError);

      expect(storage.putObject).not.toHaveBeenCalled();
    });

    it('Test 4 (DOC-06): throws ValidationError for disallowed extension (.exe); does NOT call putObject', async () => {
      const file = makeMulderFile('malware.exe');

      await expect(
        service.uploadExistente(FAKE_UID, FAKE_EXPEDIENTE_ID, { file, nombre: 'Archivo malo' }),
      ).rejects.toThrow(ValidationError);

      expect(storage.putObject).not.toHaveBeenCalled();
    });

    it('accepts .docx and creates documento tipo=subido', async () => {
      const file = makeMulderFile('documento.docx');
      const expectedDoc = makeDocumento({ tipo: 'subido', formato: 'docx', storagePath: 'documentos/subidos/xxx/documento.docx' });
      repo.create.mockResolvedValue(expectedDoc as any);

      const result = await service.uploadExistente(FAKE_UID, FAKE_EXPEDIENTE_ID, { file, nombre: 'Mi docx' });

      expect(storage.putObject).toHaveBeenCalledTimes(1);
      const [key, , mime] = storage.putObject.mock.calls[0];
      expect(key).toContain('documentos/subidos/');
      expect(key).toContain('.docx');
      expect(mime).toContain('wordprocessingml');
      expect(result).toBe(expectedDoc);
    });

    it('accepts .pdf and uses correct MIME type', async () => {
      const file = makeMulderFile('contrato.pdf');
      repo.create.mockResolvedValue(makeDocumento({ tipo: 'subido', formato: 'pdf' }) as any);

      await service.uploadExistente(FAKE_UID, FAKE_EXPEDIENTE_ID, { file, nombre: 'PDF Doc' });

      const [, , mime] = storage.putObject.mock.calls[0];
      expect(mime).toBe('application/pdf');
    });

    it('accepts .txt and uses correct MIME type', async () => {
      const file = makeMulderFile('nota.txt');
      repo.create.mockResolvedValue(makeDocumento({ tipo: 'subido', formato: 'txt' }) as any);

      await service.uploadExistente(FAKE_UID, FAKE_EXPEDIENTE_ID, { file, nombre: 'Nota TXT' });

      const [, , mime] = storage.putObject.mock.calls[0];
      expect(mime).toBe('text/plain');
    });
  });

  // ── Test 5 (DOC-05): getDownloadUrl ──────────────────────────────────────

  describe('getDownloadUrl', () => {
    it('Test 5 (DOC-05): calls storage.getPresignedUrl(storagePath, 300) and returns { url }', async () => {
      const documento = makeDocumento({ storagePath: 'documentos/generados/abc/contrato.docx' });
      repo.findById.mockResolvedValue(documento as any);
      storage.getPresignedUrl.mockResolvedValue('https://minio.local/presigned?token=xyz');

      const result = await service.getDownloadUrl(FAKE_UID, documento._id.toString());

      expect(storage.getPresignedUrl).toHaveBeenCalledWith(
        'documentos/generados/abc/contrato.docx',
        300,
      );
      expect(result).toEqual({ url: 'https://minio.local/presigned?token=xyz' });
    });

    it('throws NotFoundError when documento does not exist', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.getDownloadUrl(FAKE_UID, '507f1f77bcf86cd799439099'),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ── list ─────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('returns paginated result from repo', async () => {
      const items = [makeDocumento()];
      repo.listByExpediente.mockResolvedValue({ items: items as any, total: 1 });

      const result = await service.list(FAKE_UID, FAKE_EXPEDIENTE_ID, { page: 1, limit: 10 });

      expect(result.items).toBe(items);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('returns soft-deleted document', async () => {
      const documento = makeDocumento({ activo: false });
      repo.softDelete.mockResolvedValue(documento as any);

      const result = await service.remove(FAKE_UID, documento._id.toString());
      expect(result).toBe(documento);
    });

    it('throws NotFoundError when softDelete returns null', async () => {
      repo.softDelete.mockResolvedValue(null);

      await expect(service.remove(FAKE_UID, '507f1f77bcf86cd799439099')).rejects.toThrow(NotFoundError);
    });

    // ── CAL-05: eventosAction tests ───────────────────────────────────────

    it('CAL-05 (eliminar): softDeletes document then calls eventosRepo.softDeleteByDocumentoId once', async () => {
      const documento = makeDocumento({ activo: false });
      repo.softDelete.mockResolvedValue(documento as any);
      eventosRepo.softDeleteByDocumentoId.mockResolvedValue(2);

      const docId = documento._id.toString();
      const result = await service.remove(FAKE_UID, docId, 'eliminar');

      expect(repo.softDelete).toHaveBeenCalledWith(FAKE_UID, docId);
      expect(eventosRepo.softDeleteByDocumentoId).toHaveBeenCalledTimes(1);
      expect(eventosRepo.softDeleteByDocumentoId).toHaveBeenCalledWith(FAKE_UID, docId);
      expect(result).toBe(documento);
    });

    it('CAL-05 (conservar): softDeletes document and does NOT call eventosRepo.softDeleteByDocumentoId', async () => {
      const documento = makeDocumento({ activo: false });
      repo.softDelete.mockResolvedValue(documento as any);

      const docId = documento._id.toString();
      const result = await service.remove(FAKE_UID, docId, 'conservar');

      expect(repo.softDelete).toHaveBeenCalledWith(FAKE_UID, docId);
      expect(eventosRepo.softDeleteByDocumentoId).not.toHaveBeenCalled();
      expect(result).toBe(documento);
    });

    it('CAL-05 (not-found): throws NotFoundError before calling eventosRepo when document does not exist', async () => {
      repo.softDelete.mockResolvedValue(null);

      await expect(
        service.remove(FAKE_UID, '507f1f77bcf86cd799439099', 'eliminar'),
      ).rejects.toThrow(NotFoundError);

      expect(eventosRepo.softDeleteByDocumentoId).not.toHaveBeenCalled();
    });
  });
});
