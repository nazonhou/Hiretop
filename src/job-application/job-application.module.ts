import { Module } from '@nestjs/common';
import { JobApplicationRepository } from './job-application.repository';
import { JobOfferApplicationController } from './job-offer-application.controller';
import { JobApplicationService } from './job-application.service';
import { JobOfferModule } from '@job-offer/job-offer.module';

@Module({
  providers: [JobApplicationRepository, JobApplicationService],
  controllers: [JobOfferApplicationController],
  imports: [JobOfferModule]
})
export class JobApplicationModule {}
