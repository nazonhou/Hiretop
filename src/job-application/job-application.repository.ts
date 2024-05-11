import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-module/prisma.service';
import { CreateJobApplicationDto } from './create-job-application.dto';

@Injectable()
export class JobApplicationRepository {
  constructor(private prismaService: PrismaService) {}

  createJobApplication(createJobApplicationDto: CreateJobApplicationDto) {
    return this.prismaService.jobApplication.create({
      data: createJobApplicationDto
    });
  }
}
