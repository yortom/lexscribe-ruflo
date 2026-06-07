import { createZodDto } from 'nestjs-zod';
import { QueryEventoSchema } from '@lexscribe/shared-validation';

export class QueryEventoDto extends createZodDto(QueryEventoSchema) {}
