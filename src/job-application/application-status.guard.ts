import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JobApplicationStatus } from '@prisma/client';
import { Observable } from 'rxjs';
import { APPLICATION_STATUS_KEY } from './application-status.decorator';

@Injectable()
export class ApplicationStatusGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const requiredJobApplicationStatus = this.reflector.getAllAndOverride<JobApplicationStatus>(
      APPLICATION_STATUS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const { jobApplicationStatus } = context.switchToHttp().getRequest<{
      jobApplicationStatus?: JobApplicationStatus
    }>();

    return requiredJobApplicationStatus == jobApplicationStatus;
  }
}
