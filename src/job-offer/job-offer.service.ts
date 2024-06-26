import { TokenPayload } from '@auth/auth.service';
import { Injectable } from '@nestjs/common';
import { CreateJobOfferDto } from './create-job-offer.dto';
import { JobOfferRepository } from './job-offer.repository';
import { SearchJobOfferDto } from './search-job-offer.dto';
import { GetJobOfferStatisticsDto } from './get-job-offer-statistics.dto';

@Injectable()
export class JobOfferService {
  constructor(private jobOfferRepository: JobOfferRepository) {}

  createJobOffer(
    user: TokenPayload,
    createJobOfferDto: CreateJobOfferDto
  ) {
    return this.jobOfferRepository.createJobOffer(
      user.sub, user.company.id, createJobOfferDto
    );
  }

  searchJobOffers(
    user: TokenPayload,
    searchJobOfferDto: SearchJobOfferDto
  ) {
    return this.jobOfferRepository.findJobOffersByUserId(
      user.sub, searchJobOfferDto
    );
  }

  getJobOffersStatistics(user: TokenPayload, getJobOfferStatisticsDto: GetJobOfferStatisticsDto) {
    return this.jobOfferRepository.getJobOffersStatistics(user.company?.id, getJobOfferStatisticsDto);
  }
}
