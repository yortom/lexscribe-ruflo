import { createZodDto } from 'nestjs-zod';
import { UpdateClausulaSchema } from '@lexscribe/shared-validation';

export class UpdateClausulaDto extends createZodDto(UpdateClausulaSchema) {}
