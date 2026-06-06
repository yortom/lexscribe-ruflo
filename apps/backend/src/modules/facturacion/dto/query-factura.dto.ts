import { createZodDto } from 'nestjs-zod';
import { QueryFacturaSchema } from '@lexscribe/shared-validation';

export class QueryFacturaDto extends createZodDto(QueryFacturaSchema) {}
