import { Injectable } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { TokenPayload } from '@auth/auth.service';
import { CreateJobApplicationDto } from './create-job-application.dto';
import { PaginationDto } from '@src/pagination.dto';

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
}
