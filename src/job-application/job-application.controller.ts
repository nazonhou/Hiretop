import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { JobApplicationService } from './job-application.service';
import { ApplicationStatus } from './application-status.decorator';
import { JobApplicationStatus, Role } from '@prisma/client';
import { CompanyJobApplicationGuard } from './company-job-application.guard';
import { ApplicationStatusGuard } from './application-status.guard';
import { RejectJobApplicationDto } from './reject-job-application.dto';
import { Roles } from '@auth/roles.decorator';
import { AcceptJobApplicationDto } from './accept-job-application.dto';

@Controller('job-applications')
export class JobApplicationController {
  constructor(private jobApplicationService: JobApplicationService) {}

  @HttpCode(HttpStatus.OK)
  @ApplicationStatus(JobApplicationStatus.TO_ASSESS)
  @UseGuards(ApplicationStatusGuard)
  @UseGuards(CompanyJobApplicationGuard)
  @Roles(Role.COMPANY)
  @Put(':jobApplicationId/rejected')
  reject(
    @Param('jobApplicationId') jobApplicationId: string,
    @Body() rejectJobApplicationDto: RejectJobApplicationDto
  ) {
    return this.jobApplicationService.rejectJobApplication(jobApplicationId, rejectJobApplicationDto);
  }

  @HttpCode(HttpStatus.OK)
  @ApplicationStatus(JobApplicationStatus.TO_ASSESS)
  @UseGuards(ApplicationStatusGuard)
  @UseGuards(CompanyJobApplicationGuard)
  @Roles(Role.COMPANY)
  @Put(':jobApplicationId/accepted')
  accept(
    @Param('jobApplicationId') jobApplicationId: string,
    @Body() acceptJobApplicationDto: AcceptJobApplicationDto
  ) {
    return this.jobApplicationService.acceptJobApplication(
      jobApplicationId,
      acceptJobApplicationDto
    );
  }
}
