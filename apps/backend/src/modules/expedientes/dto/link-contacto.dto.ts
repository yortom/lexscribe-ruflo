import { createZodDto } from 'nestjs-zod';
import { LinkContactoSchema } from '@lexscribe/shared-validation';

export class LinkContactoDto extends createZodDto(LinkContactoSchema) {}
