import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { JobOfferService } from './job-offer.service';
import { CreateJobOfferDto } from './create-job-offer.dto';
import { Authenticated } from '@user/authenticated.decorator';
import { TokenPayload } from '@auth/auth.service';
import { Roles } from '@auth/roles.decorator';
import { Role } from '@prisma/client';
import { LinkedCompany } from '@auth/linked-company.decorator';
import { SearchJobOfferDto } from './search-job-offer.dto';
import { GetJobOfferStatisticsDto } from './get-job-offer-statistics.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JobOfferEntity } from './job-offer.entity';

@ApiBearerAuth()
@ApiTags('job-offers')
@Controller('job-offers')
export class JobOfferController {
  constructor(private jobOfferService: JobOfferService) {}

  /**
   * Create a job offer
   */
  @Post()
  @ApiCreatedResponse({ type: JobOfferEntity })
  @Roles(Role.COMPANY)
  @LinkedCompany()
  registerJobOffer(
    @Body() createJobOfferDto: CreateJobOfferDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobOfferService.createJobOffer(user, createJobOfferDto);
  }

  /**
   * Get a paged list of all job offers relevant to the current user
   */
  @Get()
  searchJobOffers(
    @Query() searchJobOfferDto: SearchJobOfferDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobOfferService.searchJobOffers(user, searchJobOfferDto);
  }

  /**
   * Get a statistics on all job offers created over a given period 
   */
  @Get('statistics')
  @Roles(Role.COMPANY)
  @LinkedCompany()
  getJobOffersStatistics(
    @Query() getJobOfferStatisticsDto: GetJobOfferStatisticsDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobOfferService.getJobOffersStatistics(user, getJobOfferStatisticsDto);
  }
}
