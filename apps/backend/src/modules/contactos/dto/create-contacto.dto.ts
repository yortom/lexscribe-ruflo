import { createZodDto } from 'nestjs-zod';
import { CreateContactoSchema } from '@lexscribe/shared-validation';

export class CreateContactoDto extends createZodDto(CreateContactoSchema) {}
