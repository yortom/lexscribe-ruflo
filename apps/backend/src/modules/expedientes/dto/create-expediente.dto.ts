import { createZodDto } from 'nestjs-zod';
import { CreateExpedienteSchema } from '@lexscribe/shared-validation';

export class CreateExpedienteDto extends createZodDto(CreateExpedienteSchema) {}
