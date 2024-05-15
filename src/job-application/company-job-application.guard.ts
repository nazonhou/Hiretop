import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { TokenPayload } from '@auth/auth.service';
import { JobApplicationStatus } from '@prisma/client';

@Injectable()
export class CompanyJobApplicationGuard implements CanActivate {
  constructor(private jobApplicationRepository: JobApplicationRepository) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      params: { jobApplicationId: string },
      user?: TokenPayload,
      jobApplicationStatus?: JobApplicationStatus
    }>();

    const { params, user } = request;
    
    if (!user?.company?.id) {
      return false;
    }

    try {
      const jobApplication = await this.jobApplicationRepository.findOneJobApplication(
        params.jobApplicationId
      );

      if (jobApplication?.jobOffer?.companyId != user.company.id) {
        return false;
      }

      request.jobApplicationStatus = jobApplication.status;
      return true;
    } catch (error) {
      return false;
    }
  }
}
