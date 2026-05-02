import { DomainError } from './domain.error';

/** HTTP 409 — resource conflict (e.g. duplicate) */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
