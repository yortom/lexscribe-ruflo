import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { diff } from 'deep-object-diff';
import type { Request } from 'express';
import { AuditoriaService } from '../auditoria.service';
import { AuditMeta, AUDIT_KEY } from '../decorators/audited.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditoria: AuditoriaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );

    // No @Audited decorator — pass through
    if (!meta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<Request>();
    const usuarioId =
      (req.user as { id?: string } | undefined)?.id ?? null;
    const ip = req.ip ?? null;
    const userAgent = req.headers['user-agent'] ?? null;

    return next.handle().pipe(
      tap((result: unknown) => {
        // Extract recursoId from response (_id or id field)
        const resultObj = result as
          | { _id?: unknown; id?: unknown }
          | null
          | undefined;
        const recursoIdRaw = resultObj?._id ?? resultObj?.id ?? null;
        const recursoId =
          recursoIdRaw !== null && recursoIdRaw !== undefined
            ? String(recursoIdRaw)
            : null;

        // Calculate diff for update actions
        let cambios: Record<string, unknown> | null = null;
        if (meta.accion === 'update' && meta.diffBefore) {
          const before = meta.diffBefore(req) as Record<string, unknown>;
          cambios = diff(
            before ?? {},
            (result as Record<string, unknown>) ?? {},
          ) as Record<string, unknown>;
        }

        // Extract custom context if provided
        const contexto = meta.contexto?.(req, result) ?? null;

        this.auditoria.writeAsync({
          usuarioId,
          accion: meta.accion,
          recurso: meta.recurso,
          recursoId,
          cambios,
          contexto,
          ip,
          userAgent,
        });
      }),
    );
  }
}
