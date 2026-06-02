/**
 * PlantillasService — parse+validate on save, versioning, declare-variable, docx conversion.
 * PLAN-01 / PLAN-04 / PLAN-06 / F-030b.
 */
import { Injectable } from '@nestjs/common';
import {
  parseVariables,
  validarVariables,
  CreatePlantillaInput,
  UpdatePlantillaInput,
  QueryPlantillaInput,
  DeclararVariableInput,
} from '@lexscribe/shared-validation';
import { PlantillasRepository } from './plantillas.repository';
import { EsquemasService } from '../esquemas/esquemas.service';
import { StorageService } from '../../common/storage/storage.service';
import { NotFoundError, ValidationError } from '../../common/errors';
import { docxToTexto } from './conversion';

/** Slug a filename to safe ASCII for storage path (removes diacritics, replaces spaces). */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

@Injectable()
export class PlantillasService {
  constructor(
    private readonly repo: PlantillasRepository,
    private readonly esquemas: EsquemasService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Parse and validate template variables in contenido.
   * Throws ValidationError (400) if any unknown tipoObjeto found (F-030b / D-07 total block).
   */
  private detectarYValidar(contenido: string) {
    const vars = parseVariables(contenido);
    const { valido, invalidas } = validarVariables(vars);

    if (!valido) {
      const detail = invalidas
        .map((v) => `${v.raw} (línea ${v.linea})`)
        .join(', ');
      throw new ValidationError(
        `Tipo de objeto desconocido en variables: ${detail}`,
      );
    }

    return vars;
  }

  async list(usuarioId: string, query: QueryPlantillaInput) {
    const { items, total } = await this.repo.listActive(usuarioId, query);
    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(usuarioId: string, id: string) {
    const plantilla = await this.repo.findActiveById(usuarioId, id);
    if (!plantilla) throw new NotFoundError('plantilla', id);
    return plantilla;
  }

  async getVersions(usuarioId: string, raizId: string) {
    return this.repo.findVersions(usuarioId, raizId);
  }

  /** PLAN-01: Create first version from pasted text / .txt content. */
  async create(usuarioId: string, dto: CreatePlantillaInput) {
    const variablesDetectadas = this.detectarYValidar(dto.contenido);
    const doc = await this.repo.createFirstVersion(usuarioId, {
      nombre: dto.nombre,
      contenido: dto.contenido,
      formatoOriginal: dto.formatoOriginal ?? 'pegado',
      storagePath: null,
      variablesDetectadas,
      clausulasReferenciadas: [],
    });
    return doc;
  }

  /** PLAN-01 (.docx path): Extract text from buffer, detect vars, upload original to MinIO. */
  async createFromDocx(
    usuarioId: string,
    nombre: string,
    buffer: Buffer,
  ) {
    const contenido = await docxToTexto(buffer);
    const variablesDetectadas = this.detectarYValidar(contenido);

    const doc = await this.repo.createFirstVersion(usuarioId, {
      nombre,
      contenido,
      formatoOriginal: 'docx',
      storagePath: null,
      variablesDetectadas,
      clausulasReferenciadas: [],
    });

    // Upload original .docx to MinIO
    const key = `plantillas/${String(doc._id)}/${slugify(nombre)}.docx`;
    await this.storage.putObject(
      key,
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Update storagePath on the doc
    const updated = await this.repo.updateStoragePath(String(doc._id), key);
    return updated ?? doc;
  }

  /**
   * PLAN-06: Edit plantilla — creates a new active version, marks prior version inactive.
   * Uses insert-then-deactivate two-step (no transaction, single-node mongod).
   */
  async update(usuarioId: string, id: string, dto: UpdatePlantillaInput) {
    // Load current active version to get plantillaRaizId
    const current = await this.repo.findActiveById(usuarioId, id);
    if (!current) throw new NotFoundError('plantilla', id);

    const variablesDetectadas = this.detectarYValidar(dto.contenido);

    const newVersion = await this.repo.createNewVersion(
      usuarioId,
      String(current.plantillaRaizId),
      {
        nombre: dto.nombre ?? current.nombre,
        contenido: dto.contenido,
        formatoOriginal: current.formatoOriginal,
        storagePath: null, // new version has no .docx upload by default
        variablesDetectadas,
        clausulasReferenciadas: current.clausulasReferenciadas.map((id) => id),
      },
    );

    return newVersion;
  }

  /**
   * PLAN-04: Declare a new dynamic-schema field from the editor.
   * Proxies to EsquemasService.addParametro.
   * Pitfall 4: clausula/fecha rejected both at Zod boundary (DeclararVariableSchema)
   * AND explicitly here as defense-in-depth.
   */
  async declararVariable(
    usuarioId: string,
    id: string,
    dto: DeclararVariableInput,
  ) {
    // Verify plantilla exists (404 if not). Include inactive versions: declaring a
    // schema field is esquema-scoped, so a superseded (post-save) version id must
    // still validate instead of 404'ing (PLAN-04 / PLAN-06 interaction).
    const plantilla = await this.repo.findByIdIncludingInactive(usuarioId, id);
    if (!plantilla) throw new NotFoundError('plantilla', id);

    // Defense-in-depth: Pitfall 4 guard (Zod already blocks, but service enforces too)
    if (dto.tipoObjeto !== 'expediente' && dto.tipoObjeto !== 'contacto') {
      throw new ValidationError(
        'Solo se pueden declarar variables de expediente o contacto',
      );
    }

    return this.esquemas.addParametro(usuarioId, dto.tipoObjeto, {
      nombre: dto.nombre,
      tipoDato: dto.tipoDato,
      obligatorio: false,
    });
  }

  async remove(usuarioId: string, id: string) {
    const deleted = await this.repo.softDelete(usuarioId, id);
    if (!deleted) throw new NotFoundError('plantilla', id);
    return deleted;
  }
}
