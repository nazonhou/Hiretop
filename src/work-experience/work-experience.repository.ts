import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateWorkExperienceDto } from "./create-work-experience.dto";

@Injectable()
export class WorkExperienceRepository {
  constructor(private prismaService: PrismaService) {}

  createWorkExperience(
    userId: string,
    createWorkExperienceDto: CreateWorkExperienceDto
  ) {
    return this.prismaService.workExperience.create({
      data: {
        companyId: createWorkExperienceDto.companyId,
        startedAt: createWorkExperienceDto.startedAt,
        title: createWorkExperienceDto.title,
        description: createWorkExperienceDto.description,
        endedAt: createWorkExperienceDto.endedAt,
        location: createWorkExperienceDto.location,
        locationType: createWorkExperienceDto.locationType,
        type: createWorkExperienceDto.type,
        userId
      }
    });
  }
}
