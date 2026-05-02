import { Catch, ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain.error';
import { ValidationError } from '../errors/validation.error';

/**
 * Global exception filter that maps DomainError subclasses to HTTP responses.
 * Response shape: { code: string, message: string }
 * NO stack trace, NO statusCode, NO PII in production.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    const body: Record<string, unknown> = {
      code: exception.code,
      message: exception.message,
    };

    // Include validation details only in non-production environments
    if (
      exception instanceof ValidationError &&
      exception.details !== undefined &&
      process.env.NODE_ENV !== 'production'
    ) {
      body.details = exception.details;
    }

    res.status(exception.httpStatus).json(body);
  }
}
