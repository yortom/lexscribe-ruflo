import { createZodDto } from 'nestjs-zod';
import { UploadDocumentoMetaSchema } from '@lexscribe/shared-validation';

export class UploadDocumentoMetaDto extends createZodDto(UploadDocumentoMetaSchema) {}
