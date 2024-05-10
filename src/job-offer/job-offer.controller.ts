import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { JobOfferService } from './job-offer.service';
import { CreateJobOfferDto } from './create-job-offer.dto';
import { Authenticated } from '@user/authenticated.decorator';
import { TokenPayload } from '@auth/auth.service';
import { Roles } from '@auth/roles.decorator';
import { Role } from '@prisma/client';
import { LinkedCompany } from '@auth/linked-company.decorator';
import { SearchJobOfferDto } from './search-job-offer.dto';

@Controller('job-offers')
export class JobOfferController {
  constructor(private jobOfferService: JobOfferService) {}

  @Post()
  @Roles(Role.COMPANY)
  @LinkedCompany()
  registerJobOffer(
    @Body() createJobOfferDto: CreateJobOfferDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobOfferService.createJobOffer(user, createJobOfferDto);
  }

  @Get()
  searchJobOffers(
    @Query() searchJobOfferDto: SearchJobOfferDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobOfferService.searchJobOffers(user, searchJobOfferDto);
  }
}
