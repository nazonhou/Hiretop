import { TokenPayload } from '@auth/auth.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Authenticated = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: TokenPayload }>();
    return request.user;
  },
);