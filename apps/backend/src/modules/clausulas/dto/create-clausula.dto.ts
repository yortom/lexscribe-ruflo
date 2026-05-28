import { createZodDto } from 'nestjs-zod';
import { CreateClausulaSchema } from '@lexscribe/shared-validation';

export class CreateClausulaDto extends createZodDto(CreateClausulaSchema) {}
