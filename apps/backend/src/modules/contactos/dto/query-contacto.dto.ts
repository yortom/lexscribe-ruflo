import { createZodDto } from 'nestjs-zod';
import { QueryContactoSchema } from '@lexscribe/shared-validation';

export class QueryContactoDto extends createZodDto(QueryContactoSchema) {}
