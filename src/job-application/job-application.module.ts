import { Module } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { JobOfferApplicationController } from './job-offer-application.controller';
import { JobApplicationService } from './job-application.service';

@Module({
  providers: [JobApplicationRepository, JobApplicationService],
  controllers: [JobOfferApplicationController]
})
export class JobApplicationModule {}
