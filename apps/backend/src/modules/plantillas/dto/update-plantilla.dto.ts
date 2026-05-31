import { createZodDto } from 'nestjs-zod';
import { UpdatePlantillaSchema } from '@lexscribe/shared-validation';

export class UpdatePlantillaDto extends createZodDto(UpdatePlantillaSchema) {}
