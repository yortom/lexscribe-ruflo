/**
 * Base class for all domain errors in Lexscribe.
 * Subclasses are translated to HTTP responses by DomainExceptionFilter.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
}
