import { createZodDto } from 'nestjs-zod';
import { UpdateExpedienteSchema } from '@lexscribe/shared-validation';

export class UpdateExpedienteDto extends createZodDto(UpdateExpedienteSchema) {}
