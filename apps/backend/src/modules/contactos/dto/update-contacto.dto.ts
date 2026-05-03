import { createZodDto } from 'nestjs-zod';
import { UpdateContactoSchema } from '@lexscribe/shared-validation';

export class UpdateContactoDto extends createZodDto(UpdateContactoSchema) {}
