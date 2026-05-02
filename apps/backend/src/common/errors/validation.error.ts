import { DomainError } from './domain.error';

/** HTTP 400 — input validation failed */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION';
  readonly httpStatus = 400;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
