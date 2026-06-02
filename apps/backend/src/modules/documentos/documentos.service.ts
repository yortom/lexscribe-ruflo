/**
 * DocumentosService — orquestación de generación, subida, descarga y gestión de documentos.
 * DOC-02: vincula asignaciones de rol antes de delegar a GenerationService.
 * DOC-04: genera documentos vía GenerationService (pipeline docxtemplater).
 * DOC-05: descarga vía presigned URL (300s TTL) desde MinIO.
 * DOC-06: subida de documentos preexistentes (.docx/.pdf/.txt).
 * DOC-07: datosCongelados gestionado en GenerationService, este service no lo muta.
 */
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import { GenerationService } from './generation/generation.service';
import { DocumentosRepository } from './documentos.repository';
import { StorageService } from '../../common/storage/storage.service';
import { ExpedientesService } from '../expedientes/expedientes.service';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors';
import type { GenerateDocumentoInput, QueryDocumentoInput } from '@lexscribe/shared-validation';

/** Slugify a filename to safe ASCII for storage path (removes diacritics, replaces spaces). */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

/** MIME type by file extension (Pitfall 5 — validate by ext, NOT browser mimetype). */
const MIME_BY_EXT: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
};

@Injectable()
export class DocumentosService {
  constructor(
    private readonly generation: GenerationService,
    private readonly repo: DocumentosRepository,
    private readonly storage: StorageService,
    @Inject(forwardRef(() => ExpedientesService))
    private readonly expedientes: ExpedientesService,
  ) {}

  /**
   * Generate a .docx document from a plantilla + expediente context.
   * DOC-02: links role assignments to expediente before delegating to GenerationService.
   * DOC-04: full pipeline via GenerationService.
   */
  async generar(
    usuarioId: string,
    expedienteId: string,
    dto: GenerateDocumentoInput,
  ) {
    // DOC-02: link each asignacion de rol — tolerate ConflictError (already linked = ok)
    for (const a of dto.asignacionesRol) {
      try {
        await this.expedientes.linkContacto(usuarioId, expedienteId, {
          contactoId: a.contactoId,
          rol: a.rol,
        });
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e;
        // Already linked — ignore and continue
      }
    }

    return this.generation.generar(usuarioId, expedienteId, dto);
  }

  /**
   * Upload a pre-existing document (.docx/.pdf/.txt) to MinIO.
   * DOC-06: validates extension (NOT browser mimetype — Pitfall 5).
   */
  async uploadExistente(
    usuarioId: string,
    expedienteId: string,
    { file, nombre }: { file: Express.Multer.File; nombre: string },
  ) {
    // Validate extension by original filename (Pitfall 5)
    const lastDot = file.originalname.lastIndexOf('.');
    const ext = lastDot !== -1 ? file.originalname.slice(lastDot).toLowerCase() : '';
    if (!MIME_BY_EXT[ext]) {
      throw new ValidationError('Formato no permitido. Solo se aceptan .docx, .pdf y .txt');
    }

    const formato = ext.slice(1) as 'docx' | 'pdf' | 'txt';
    const docId = new Types.ObjectId();
    const key = `documentos/subidos/${docId.toString()}/${slugify(nombre)}${ext}`;

    await this.storage.putObject(key, file.buffer, MIME_BY_EXT[ext]);

    return this.repo.create(usuarioId, {
      _id: docId,
      expedienteId,
      nombre,
      tipo: 'subido',
      plantillaId: null,
      datosCongelados: null,
      clausulasUsadas: null,
      storagePath: key,
      formato,
    });
  }

  /**
   * List documents for an expediente (paginated, sorted by fechaCreacion desc).
   */
  async list(usuarioId: string, expedienteId: string, query: QueryDocumentoInput) {
    const { items, total } = await this.repo.listByExpediente(usuarioId, expedienteId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  /**
   * Get a single document by ID.
   */
  async getById(usuarioId: string, id: string) {
    const d = await this.repo.findById(usuarioId, id);
    if (!d) throw new NotFoundError('documento', id);
    return d;
  }

  /**
   * Get a presigned download URL for a document (DOC-05 — 300s TTL).
   */
  async getDownloadUrl(usuarioId: string, id: string): Promise<{ url: string }> {
    const d = await this.getById(usuarioId, id);
    const url = await this.storage.getPresignedUrl(d.storagePath, 300);
    return { url };
  }

  /**
   * Soft-delete a document.
   * TODO Phase 7 FL-9: evaluar eventos asociados al borrar documento
   */
  async remove(usuarioId: string, id: string) {
    const del = await this.repo.softDelete(usuarioId, id);
    if (!del) throw new NotFoundError('documento', id);
    return del;
  }
}
