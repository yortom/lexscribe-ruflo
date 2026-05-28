import { createZodDto } from 'nestjs-zod';
import { QueryClausulaSchema } from '@lexscribe/shared-validation';

export class QueryClausulaDto extends createZodDto(QueryClausulaSchema) {}
