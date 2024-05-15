import { Module } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { JobOfferApplicationController } from './job-offer-application.controller';
import { JobApplicationService } from './job-application.service';
import { JobOfferModule } from '@job-offer/job-offer.module';
import { JobApplicationController } from './job-application.controller';

@Module({
  providers: [JobApplicationRepository, JobApplicationService],
  controllers: [JobOfferApplicationController, JobApplicationController],
  imports: [JobOfferModule]
})
export class JobApplicationModule {}
