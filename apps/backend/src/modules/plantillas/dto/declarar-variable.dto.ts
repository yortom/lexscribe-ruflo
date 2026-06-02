import { createZodDto } from 'nestjs-zod';
import { DeclararVariableSchema } from '@lexscribe/shared-validation';

export class DeclararVariableDto extends createZodDto(DeclararVariableSchema) {}
