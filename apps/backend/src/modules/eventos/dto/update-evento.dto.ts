import { createZodDto } from 'nestjs-zod';
import { UpdateEventoSchema } from '@lexscribe/shared-validation';

export class UpdateEventoDto extends createZodDto(UpdateEventoSchema) {}
