import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuditoriaService } from '../auditoria.service';

/**
 * Standard payload contract for domain events.
 *
 * All modules emitting audit-worthy events MUST use this shape:
 *   eventEmitter.emit('<recurso>.<verb>', {
 *     usuarioId: string | null,  // from JWT
 *     recurso: string,           // entity name (e.g. 'expediente')
 *     recursoId: string | null,  // entity ID
 *     contexto: Record<string, unknown> | null,  // extra data
 *     ip?: string | null,
 *     userAgent?: string | null,
 *   })
 *
 * Auth events (auth.login / auth.logout) use the same shape with recurso='usuario'.
 */
export interface AuditEventPayload {
  usuarioId: string | null;
  recurso: string;
  recursoId: string | null;
  contexto: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditListener {
  constructor(private readonly auditoria: AuditoriaService) {}

  /**
   * Handles *.linked wildcard events.
   * Example: expediente.linked, contacto.linked
   */
  @OnEvent('*.linked', { async: true })
  onLinked(payload: AuditEventPayload): void {
    this.auditoria.writeAsync({
      usuarioId: payload.usuarioId,
      accion: 'link',
      recurso: payload.recurso,
      recursoId: payload.recursoId,
      cambios: null,
      contexto: payload.contexto,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
    });
  }

  /**
   * Handles *.unlinked wildcard events.
   */
  @OnEvent('*.unlinked', { async: true })
  onUnlinked(payload: AuditEventPayload): void {
    this.auditoria.writeAsync({
      usuarioId: payload.usuarioId,
      accion: 'unlink',
      recurso: payload.recurso,
      recursoId: payload.recursoId,
      cambios: null,
      contexto: payload.contexto,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
    });
  }

  /**
   * Handles *.generated wildcard events.
   * Example: documento.generated
   */
  @OnEvent('*.generated', { async: true })
  onGenerated(payload: AuditEventPayload): void {
    this.auditoria.writeAsync({
      usuarioId: payload.usuarioId,
      accion: 'generate',
      recurso: payload.recurso,
      recursoId: payload.recursoId,
      cambios: null,
      contexto: payload.contexto,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
    });
  }

  /**
   * Handles auth.login event emitted by AuthService after successful login.
   */
  @OnEvent('auth.login', { async: true })
  onLogin(payload: AuditEventPayload): void {
    this.auditoria.writeAsync({
      usuarioId: payload.usuarioId,
      accion: 'login',
      recurso: 'usuario',
      recursoId: payload.recursoId,
      cambios: null,
      contexto: payload.contexto,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
    });
  }

  /**
   * Handles auth.logout event emitted by AuthService after logout.
   */
  @OnEvent('auth.logout', { async: true })
  onLogout(payload: AuditEventPayload): void {
    this.auditoria.writeAsync({
      usuarioId: payload.usuarioId,
      accion: 'logout',
      recurso: 'usuario',
      recursoId: payload.recursoId,
      cambios: null,
      contexto: payload.contexto,
      ip: payload.ip ?? null,
      userAgent: payload.userAgent ?? null,
    });
  }
}
