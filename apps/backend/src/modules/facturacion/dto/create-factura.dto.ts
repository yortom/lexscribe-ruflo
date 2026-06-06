import { createZodDto } from 'nestjs-zod';
import { CreateFacturaSchema } from '@lexscribe/shared-validation';

export class CreateFacturaDto extends createZodDto(CreateFacturaSchema) {}
