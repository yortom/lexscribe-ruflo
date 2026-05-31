import { createZodDto } from 'nestjs-zod';
import { QueryPlantillaSchema } from '@lexscribe/shared-validation';

export class QueryPlantillaDto extends createZodDto(QueryPlantillaSchema) {}
