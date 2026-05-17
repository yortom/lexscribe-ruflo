import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtUser = { id: string; email: string };

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
  },
);
