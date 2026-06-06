import { createZodDto } from 'nestjs-zod';
import { CreateEventoSchema } from '@lexscribe/shared-validation';

export class CreateEventoDto extends createZodDto(CreateEventoSchema) {}
