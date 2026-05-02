export type AuditAccion =
  | 'create'
  | 'update'
  | 'delete'
  | 'link'
  | 'unlink'
  | 'generate'
  | 'login'
  | 'logout';

export interface AuditoriaRecord {
  usuarioId: string | null;
  accion: AuditAccion;
  recurso: string;
  recursoId: string | null;
  cambios: Record<string, unknown> | null;
  contexto: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  timestamp: Date;
}
