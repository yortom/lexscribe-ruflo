import { DomainError } from './domain.error';

/**
 * NotImplementedError — 501 NOT_IMPLEMENTED
 * Used for features that are deferred to post-MVP (e.g. F-095 delete parameter).
 */
export class NotImplementedError extends DomainError {
  readonly code = 'NOT_IMPLEMENTED';
  readonly httpStatus = 501;

  constructor(message = 'Not Implemented') {
    super(message);
    this.name = 'NotImplementedError';
  }
}
