import { Injectable } from '@nestjs/common';
import { JobInterviewRepository } from './job-interview.repository';

@Injectable()
export class JobInterviewService {
  constructor(private jobInterviewRepository: JobInterviewRepository) {}
}
