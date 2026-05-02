import { createZodDto } from 'nestjs-zod';
import { AddParametroSchema } from '@lexscribe/shared-validation';

export class AddParametroDto extends createZodDto(AddParametroSchema) {}
