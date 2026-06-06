import { createZodDto } from 'nestjs-zod';
import { GenerateDocumentoSchema } from '@lexscribe/shared-validation';

export class GenerateDocumentoDto extends createZodDto(GenerateDocumentoSchema) {}
