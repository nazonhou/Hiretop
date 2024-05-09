import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenPayload } from './auth.service';
import { IS_COMPANY_USER_KEY } from './linked-company.decorator';

@Injectable()
export class CompanyUserGuard {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isCompanyUser = this.reflector.getAllAndOverride<boolean>(IS_COMPANY_USER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isCompanyUser) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<{ user?: TokenPayload }>();
    return user && 'company' in user;
  }
}
