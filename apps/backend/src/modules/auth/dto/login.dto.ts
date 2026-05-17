import { createZodDto } from 'nestjs-zod';
import { LoginSchema, LoginInput } from '@lexscribe/shared-validation';

// createZodDto generates a class from a Zod schema. The base class is exported
// from nestjs-zod directly to avoid TS2742 (non-portable type reference).
const LoginDtoBase = createZodDto(LoginSchema);

export class LoginDto extends LoginDtoBase implements LoginInput {
  declare email: string;
  declare password: string;
}
