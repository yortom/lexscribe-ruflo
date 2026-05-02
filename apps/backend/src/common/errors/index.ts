/**
 * Domain error classes for Lexscribe.
 * All errors extend DomainError and are handled by DomainExceptionFilter.
 *
 * HTTP mapping:
 *   NotFoundError    → 404 NOT_FOUND
 *   ConflictError    → 409 CONFLICT
 *   ValidationError  → 400 VALIDATION
 *   UnauthorizedError → 401 UNAUTHORIZED
 */
export { DomainError } from './domain.error';
export { NotFoundError } from './not-found.error';
export { ConflictError } from './conflict.error';
export { ValidationError } from './validation.error';
export { UnauthorizedError } from './unauthorized.error';
export { NotImplementedError } from './not-implemented.error';
