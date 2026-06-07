import { createZodDto } from 'nestjs-zod';
import { UpdateEstadoSchema } from '@lexscribe/shared-validation';

export class UpdateEstadoDto extends createZodDto(UpdateEstadoSchema) {}
