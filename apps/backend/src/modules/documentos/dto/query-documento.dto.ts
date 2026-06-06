import { createZodDto } from 'nestjs-zod';
import { QueryDocumentoSchema } from '@lexscribe/shared-validation';

export class QueryDocumentoDto extends createZodDto(QueryDocumentoSchema) {}
