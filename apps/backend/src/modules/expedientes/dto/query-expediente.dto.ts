import { createZodDto } from 'nestjs-zod';
import { QueryExpedienteSchema } from '@lexscribe/shared-validation';

export class QueryExpedienteDto extends createZodDto(QueryExpedienteSchema) {}
