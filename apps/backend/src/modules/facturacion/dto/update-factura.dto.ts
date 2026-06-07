import { createZodDto } from 'nestjs-zod';
import { UpdateFacturaSchema } from '@lexscribe/shared-validation';

export class UpdateFacturaDto extends createZodDto(UpdateFacturaSchema) {}
