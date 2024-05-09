import { TokenPayload } from '@auth/auth.service';
import { Injectable } from '@nestjs/common';
import { CreateJobOfferDto } from './create-job-offer.dto';
import { JobOfferRepository } from './job-offer.repository';

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
}
