import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateJobOfferDto } from "./create-job-offer.dto";

@Injectable()
export class JobOfferRepository {
  constructor(private prismaService: PrismaService) {}

  createJobOffer(authorId: string, companyId: string, createJobOfferDto: CreateJobOfferDto) {
    const { skillIds, ...dataToInsert } = createJobOfferDto;
    return this.prismaService.jobOffer.create({
      data: {
        ...dataToInsert,
        postedAt: new Date(),
        author: { connect: { id: authorId } },
        company: { connect: { id: companyId } },
        skills: { connect: skillIds.map(skillId => ({ id: skillId })) }
      }
    })
  }
}
