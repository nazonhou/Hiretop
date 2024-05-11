import { Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JobOfferUnexpiredGuard } from '@job-offer/job-offer-unexpired.guard';
import { JobApplicationService } from './job-application.service';
import { Authenticated } from '@user/authenticated.decorator';
import { TokenPayload } from '@auth/auth.service';

@Controller('job-offers/:jobOfferId/job-applications')
export class JobOfferApplicationController {
  constructor(private jobApplicationService: JobApplicationService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseGuards(JobOfferUnexpiredGuard)
  apply(
    @Param('jobOfferId') jobOfferId: string,
    @Authenticated() user: TokenPayload
  ) {
    return this.jobApplicationService.apply(user, jobOfferId);
  }
}
