import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";

@Injectable()
export class JobInterviewRepository {
  constructor(private prismaService: PrismaService) {}

  findJobInterviewsWhichOverlaps(startedAt: Date, endedAt: Date, companyId: string) {
    return this.prismaService.jobInterview.findMany({
      where: {
        startedAt: { lt: endedAt },
        endedAt: { gt: startedAt },
        jobApplication: {
          jobOffer: {
            companyId: { equals: companyId }
          }
        }
      }
    });
  }
}
