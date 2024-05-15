import { SetMetadata } from '@nestjs/common';
import { JobApplicationStatus } from '@prisma/client';

export const APPLICATION_STATUS_KEY = 'job-application-status';
export const ApplicationStatus = (jobApplicationStatus: JobApplicationStatus) =>
  SetMetadata('job-application-status', jobApplicationStatus);
