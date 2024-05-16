import { Module } from '@nestjs/common';
import { JobInterviewRepository } from './job-interview.repository';
import { JobInterviewService } from './job-interview.service';

@Module({
  providers: [JobInterviewRepository, JobInterviewService],
  exports: [JobInterviewRepository]
})
export class JobInterviewModule {}
