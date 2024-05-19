import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { JobOfferUnexpiredGuard } from '@job-offer/job-offer-unexpired.guard';
import { JobApplicationService } from './job-application.service';
import { Authenticated } from '@user/authenticated.decorator';
import { TokenPayload } from '@auth/auth.service';
import { CompanyJobOfferGuard } from '@job-offer/company-job-offer.guard';
import { PaginationDto } from '@src/pagination.dto';
import { Roles } from '@auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('job-applications')
@Controller('job-offers/:jobOfferId/job-applications')
export class JobOfferApplicationController {
  constructor(private jobApplicationService: JobApplicationService) {}

  /**
   * Apply to a job offer
   */
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseGuards(JobOfferUnexpiredGuard)
  apply(
    @Param('jobOfferId') jobOfferId: string,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobApplicationService.apply(user, jobOfferId);
  }

  /**
   * Get a paged list of all job applications received for a job offer
   */
  @HttpCode(HttpStatus.OK)
  @Get()
  @Roles(Role.COMPANY)
  @UseGuards(CompanyJobOfferGuard)
  getJobApplications(
    @Param('jobOfferId') jobOfferId: string,
    @Query() paginationDto: PaginationDto
  ) {
    return this.jobApplicationService.findApplicationsByJobOfferId(
      jobOfferId, paginationDto
    );
  }

  /**
   * Get all the details about one job application
   */
  @HttpCode(HttpStatus.OK)
  @Get(':jobApplicationId')
  @Roles(Role.COMPANY)
  getOneJobApplication(
    @Param('jobOfferId') jobOfferId: string,
    @Param('jobApplicationId') jobApplicationId: string,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobApplicationService.findOneJobApplication({
      jobApplicationId,
      jobOfferId,
      user
    });
  }
}
