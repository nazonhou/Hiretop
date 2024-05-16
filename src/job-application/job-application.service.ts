import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { TokenPayload } from '@auth/auth.service';
import { CreateJobApplicationDto } from './create-job-application.dto';
import { PaginationDto } from '@src/pagination.dto';
import { FindOneJobApplicationDto } from './find-one-job-application.dto';
import { RejectJobApplicationDto } from './reject-job-application.dto';
import { AcceptJobApplicationDto } from './accept-job-application.dto';

@Injectable()
export class JobApplicationService {
  constructor(private jobApplicationRepository: JobApplicationRepository) {}

  apply(user: TokenPayload, jobOfferId: string) {
    const createJobApplicationDto: CreateJobApplicationDto = {
      applicantId: user.sub,
      jobOfferId
    };
    return this.jobApplicationRepository.createJobApplication(
      createJobApplicationDto
    );
  }

  findApplicationsByJobOfferId(jobOfferId: string, paginationDto: PaginationDto) {
    return this.jobApplicationRepository.findApplicationsByJobOfferId(
      jobOfferId, paginationDto
    );
  }

  async findOneJobApplication({ jobApplicationId, jobOfferId, user }: FindOneJobApplicationDto) {
    try {
      const jobApplication = await this.jobApplicationRepository.findOneJobApplication(
        jobApplicationId
      );

      if (jobApplication?.jobOfferId == jobOfferId
        && jobApplication?.jobOffer.companyId == user.company?.id) {
        return jobApplication;
      }

      throw new ForbiddenException();
    } catch (error) {
      throw new ForbiddenException();
    }
  }

  rejectJobApplication(
    jobApplicationId: string,
    rejectJobApplicationDto: RejectJobApplicationDto
  ) {
    return this.jobApplicationRepository.rejectJobApplication(
      jobApplicationId,
      rejectJobApplicationDto
    );
  }

  acceptJobApplication(
    jobApplicationId: string,
    acceptJobApplicationDto: AcceptJobApplicationDto
  ) {
    return this.jobApplicationRepository.acceptJobApplication(
      jobApplicationId, acceptJobApplicationDto
    );
  }
}
