/**
 * GenerationService — docxtemplater pipeline (DOC-04).
 *
 * Pipeline:
 *  1. Load plantilla + expediente
 *  2. Auto-declare new campos in esquema dinámico (DOC-03)
 *  3. Build datosCongelados JSON (buildContext)
 *  4. Validate all plantilla variables resolve (Pitfall 4)
 *  5. Get base .docx buffer (from MinIO or textoToDocxBuffer for storagePath=null, D-01)
 *  6. Render with docxtemplater
 *  7. Upload rendered .docx to MinIO
 *  8. Persist documento with datosCongelados snapshot (DOC-07)
 */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { Types } from 'mongoose';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { GenerateDocumentoInput } from '@lexscribe/shared-validation';
import { ValidationError, NotFoundError } from '../../../common/errors';
import { StorageService } from '../../../common/storage/storage.service';
import { EsquemasService } from '../../esquemas/esquemas.service';
import { DocumentosRepository } from '../documentos.repository';
import { DocumentoDocument } from '../schemas/documento.schema';
import { textoToDocxBuffer } from '../../plantillas/conversion';
import { PlantillasService } from '../../plantillas/plantillas.service';
import { ExpedientesRepository } from '../../expedientes/expedientes.repository';

/** Slug a filename to safe ASCII for storage path (removes diacritics, replaces spaces). */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

@Injectable()
export class GenerationService {
  constructor(
    private readonly plantillasService: PlantillasService,
    @Inject(forwardRef(() => ExpedientesRepository))
    private readonly expedientesRepo: ExpedientesRepository,
    private readonly esquemas: EsquemasService,
    private readonly storage: StorageService,
    private readonly repo: DocumentosRepository,
  ) {}

  /**
   * Generate a .docx document from a plantilla + expediente context.
   * DOC-04: renders docxtemplater, uploads to MinIO, persists datosCongelados.
   */
  async generar(
    usuarioId: string,
    expedienteId: string,
    dto: GenerateDocumentoInput,
  ): Promise<DocumentoDocument> {
    // Step 1: Load plantilla + expediente
    const plantilla = await this.plantillasService.getById(usuarioId, dto.plantillaId);
    const expediente = await this.expedientesRepo.findById(usuarioId, expedienteId);
    if (!expediente) {
      throw new NotFoundError('expediente', expedienteId);
    }

    // Step 2: DOC-03 — auto-declare new campos in esquema dinámico
    for (const campo of dto.camposNuevos) {
      await this.esquemas.addParametro(usuarioId, campo.tipoObjeto, {
        nombre: campo.nombre,
        tipoDato: campo.tipoDato ?? 'texto',
        obligatorio: false,
      });
    }

    // Step 3: Build datosCongelados (buildContext)
    const datosCongelados = this.buildContext(expediente, dto);

    // Step 4: Validate variable completeness (Pitfall 4) — must happen BEFORE render
    const unresolved = this.validateContext(plantilla.variablesDetectadas, datosCongelados);
    if (unresolved.length > 0) {
      throw new ValidationError(
        `Variables sin resolver: ${unresolved.join(', ')}`,
      );
    }

    // Step 5: Get base .docx buffer
    const baseBuffer: Buffer = plantilla.storagePath
      ? await this.storage.getObject(plantilla.storagePath)
      : await textoToDocxBuffer(plantilla.contenido);

    // Step 6: Render with docxtemplater (Pattern 1)
    const zip = new PizZip(baseBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(datosCongelados);
    const out: Buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

    // Step 7: Upload rendered .docx to MinIO
    const docId = new Types.ObjectId();
    const key = `documentos/generados/${docId.toString()}/${slugify(dto.nombre)}.docx`;
    await this.storage.putObject(
      key,
      out,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );

    // Step 8: Persist documento with datosCongelados snapshot (DOC-07 — never mutate after this)
    return this.repo.create(usuarioId, {
      _id: docId,
      expedienteId,
      nombre: dto.nombre,
      tipo: 'generado',
      plantillaId: dto.plantillaId,
      datosCongelados,
      clausulasUsadas:
        Array.isArray(plantilla.clausulasReferenciadas) && plantilla.clausulasReferenciadas.length > 0
          ? plantilla.clausulasReferenciadas.map((id: Types.ObjectId | string) => String(id))
          : null,
      storagePath: key,
      formato: 'docx',
    });
  }

  /**
   * Build the datosCongelados JSON context for docxtemplater rendering.
   * Structure: { expediente, contacto: { [rol]: {...} }, clausula, fecha }
   * (Claude's Discretion — CONTEXT.md + ARQUITECTURA.md §7.2)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildContext(
    expediente: any,
    dto: GenerateDocumentoInput,
  ): Record<string, unknown> {
    return {
      expediente: {
        nombre: expediente.nombre,
        fechaCreacion: expediente.fechaCreacion,
        ...expediente.parametros,
        ...dto.valores.expediente,
      },
      contacto: dto.valores.contacto,
      clausula: dto.valores.clausula,
      fecha: dto.valores.fecha,
    };
  }

  /**
   * Validate that all plantilla variables resolve in the context.
   * Returns list of unresolved variable raw strings (Pitfall 4 defense-in-depth).
   */
  private validateContext(
    variablesDetectadas: Array<{ raw: string; tipoObjeto: string; rol: string | null; campo: string }>,
    context: Record<string, unknown>,
  ): string[] {
    const unresolved: string[] = [];

    for (const v of variablesDetectadas) {
      const val = this.resolveVar(v, context);
      if (val === undefined || val === null || val === '') {
        unresolved.push(v.raw);
      }
    }

    return unresolved;
  }

  private resolveVar(
    v: { tipoObjeto: string; rol: string | null; campo: string },
    context: Record<string, unknown>,
  ): unknown {
    const tipoSection = context[v.tipoObjeto] as Record<string, unknown> | undefined;
    if (!tipoSection) return undefined;

    if (v.tipoObjeto === 'expediente' || v.tipoObjeto === 'fecha') {
      // Two-part: expediente.campo or fecha.campo
      return tipoSection[v.campo];
    }

    if (v.tipoObjeto === 'contacto' || v.tipoObjeto === 'clausula') {
      // Three-part: contacto.rol.campo or clausula.nombre.campo
      if (!v.rol) return undefined;
      const rolSection = tipoSection[v.rol] as Record<string, unknown> | undefined;
      if (!rolSection) return undefined;
      return rolSection[v.campo];
    }

    return undefined;
  }
}
