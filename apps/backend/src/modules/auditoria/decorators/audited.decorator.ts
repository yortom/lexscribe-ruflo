import { SetMetadata } from '@nestjs/common';
import type { AuditAccion } from '../types';

export const AUDIT_KEY = 'audit:meta';

export interface AuditMeta {
  recurso: string;
  accion: AuditAccion;
  /** Extract the "before" state from request for update diff. */
  diffBefore?: (req: unknown) => unknown;
  /** Extract extra context to store in `contexto` field. */
  contexto?: (req: unknown, result: unknown) => Record<string, unknown> | null;
}

/**
 * Mark a controller method for audit logging.
 *
 * @param recurso - Domain entity name (e.g. 'expediente', 'contacto')
 * @param accion  - Audit action type
 * @param opts    - Optional: diffBefore extractor for update diffs, contexto extractor
 *
 * @example
 *   @Audited('expediente', 'create')
 *   create(@Body() dto, @CurrentUser('id') uid) { ... }
 *
 *   @Audited('expediente', 'update', { diffBefore: req => req.body.__before })
 *   update(...) { ... }
 */
export const Audited = (
  recurso: string,
  accion: AuditAccion,
  opts: Partial<Pick<AuditMeta, 'diffBefore' | 'contexto'>> = {},
) => SetMetadata<string, AuditMeta>(AUDIT_KEY, { recurso, accion, ...opts });
