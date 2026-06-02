import { createZodDto } from 'nestjs-zod';
import { CreatePlantillaSchema } from '@lexscribe/shared-validation';

export class CreatePlantillaDto extends createZodDto(CreatePlantillaSchema) {}
