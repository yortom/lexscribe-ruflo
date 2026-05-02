import { Injectable, Logger } from '@nestjs/common';
import { AuditoriaRepository } from './auditoria.repository';
import type { AuditoriaRecord } from './types';

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly repo: AuditoriaRepository) {}

  /**
   * Write an audit record asynchronously (non-blocking).
   * Uses setImmediate so the HTTP response is never delayed.
   */
  writeAsync(
    record: Omit<AuditoriaRecord, 'timestamp' | 'cambios' | 'contexto'> & {
      timestamp?: Date;
      cambios?: Record<string, unknown> | null;
      contexto?: Record<string, unknown> | null;
    },
  ): void {
    const final: AuditoriaRecord = {
      cambios: null,
      contexto: null,
      ...record,
      timestamp: record.timestamp ?? new Date(),
    };
    setImmediate(() => {
      this.repo
        .create(final)
        .catch((err: unknown) =>
          this.logger.error({ err, record: final }, 'auditoria.write.failed'),
        );
    });
  }
}
