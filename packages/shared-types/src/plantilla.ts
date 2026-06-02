/**
 * TypeScript interfaces for the Plantillas module.
 * Mirrors DATOS.md §4.3 plantillas schema.
 */

/** A detected variable occurrence in a plantilla's contenido (F-023, DATOS §4.3). */
export interface VariableDetectada {
  raw: string; // "{{contacto.vendedor.nombre}}"
  tipoObjeto: string; // "contacto"
  rol: string | null; // "vendedor" or null for two-part variables
  campo: string; // "nombre"
  esArray: boolean; // F-025 — always false in MVP
}

/** A plantilla version document (DATOS §4.3). Editing creates a NEW version. */
export interface Plantilla {
  _id: string;
  usuarioId: string;
  /** Logical identity shared across all versions. If _id === plantillaRaizId this is v1. */
  plantillaRaizId: string;
  version: number;
  nombre: string;
  /** Plain text with {{...}} markers (F-020/F-021/F-022). */
  contenido: string;
  /** Source format of the original upload (F-020/F-021/F-022). */
  formatoOriginal: 'txt' | 'docx' | 'pegado';
  /** MinIO storage path to original file, or null if pasted text. */
  storagePath: string | null;
  /** Materialised view of detected variables (recalculated on save, F-023). */
  variablesDetectadas: VariableDetectada[];
  /** Clause references for this plantilla version (F-028). */
  clausulasReferenciadas: string[];
  /** Only the current version is activo:true. */
  activo: boolean;
  /** Set when this version is superseded by a newer one. */
  fechaInactivacion: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Paginated list response for plantillas. */
export interface PlantillaListResponse {
  items: Plantilla[];
  total: number;
  page: number;
  limit: number;
}
