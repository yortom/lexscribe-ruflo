import { DomainError } from './domain.error';

/** HTTP 404 — resource not found */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  readonly httpStatus = 404;

  constructor(
    public readonly resource: string,
    public readonly id: string,
  ) {
    super(`${resource} ${id} not found`);
    this.name = 'NotFoundError';
  }
}
