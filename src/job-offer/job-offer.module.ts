import { Module } from '@nestjs/common';
import { JobOfferRepository } from './job-offer.repository';
import { JobOfferService } from './job-offer.service';
import { JobOfferController } from './job-offer.controller';

@Module({
  providers: [JobOfferRepository, JobOfferService],
  controllers: [JobOfferController]
})
export class JobOfferModule {}
