import { createZodDto } from 'nestjs-zod';
import { LoginSchema } from '@lexscribe/shared-validation';

export class LoginDto extends createZodDto(LoginSchema) {}
