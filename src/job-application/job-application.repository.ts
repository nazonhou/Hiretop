import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-module/prisma.service';
import { CreateJobApplicationDto } from './create-job-application.dto';
import { PaginationDto } from '@src/pagination.dto';
import { RawJobApplicationDto } from './raw-job-application.dto';
import { JobApplicationDto } from './job-application.dto';

@Injectable()
export class JobApplicationRepository {
  constructor(private prismaService: PrismaService) {}

  createJobApplication(createJobApplicationDto: CreateJobApplicationDto) {
    return this.prismaService.jobApplication.create({
      data: createJobApplicationDto
    });
  }

  async findApplicationsByJobOfferId(
    jobOfferId: string,
    paginationDto: PaginationDto
  ): Promise<{
    total: number;
    data: Partial<JobApplicationDto>[];
  }> {
    let query = '';
    query += 'with "_ApplicantMatchedSkills" as ( ';
    query += 'select ';
    query += '  us."B" as "userId", ';
    query += '  count(us."A")::int as "matchedSkills" ';
    query += 'from ';
    query += '  job_applications ja ';
    query += 'join job_offers jo on ';
    query += '  jo.id = ja.job_offer_id ';
    query += 'join "_JobOfferToSkill" jots on ';
    query += '  jots."A" = jo.id ';
    query += 'join "_UserSkills" us on ';
    query += '  (us."A" = jots."B" ';
    query += '    and us."B" = ja.applicant_id) ';
    query += 'where ';
    query += '  jo.id = $1::uuid ';
    query += 'group by ';
    query += '  us."B" ';
    query += '), ';
    query += '"_ApplicationWithApplicant" as ( ';
    query += 'select ';
    query += '  u.*, ';
    query += '  ja.applied_at as "appliedAt", ';
    query += '  ja.status::"JobApplicationStatus" as "jobApplicationStatus", ';
    query += '  ja.job_offer_id as "jobOfferId", ';
    query += '  ja.id as "jobApplicationId" ';
    query += 'from ';
    query += '  users u ';
    query += 'join job_applications ja on ';
    query += '  u.id = ja.applicant_id ';
    query += 'where ';
    query += '  ja.job_offer_id = $1::uuid ';
    query += '), ';
    query += '"_JobOfferTotalSkills" as ( ';
    query += 'select ';
    query += '  count(*)::int as "totalSkills", ';
    query += '  $1::uuid as "jobOfferId" ';
    query += 'from ';
    query += '  job_offers jo ';
    query += 'join "_JobOfferToSkill" jots on ';
    query += '  jots."A" = jo.id ';
    query += 'where ';
    query += '  jo.id = $1::uuid ';
    query += ') ';
    query += 'select ';
    query += '  ams."matchedSkills", ';
    query += '  awa.*, ';
    query += '  jotsk."totalSkills", ';
    query += '  (ams."matchedSkills"::float / jotsk."totalSkills") as "matchingRate", ';
    query += '  (count(*) over())::int as "totalCount" ';
    query += 'from ';
    query += '  "_ApplicantMatchedSkills" ams ';
    query += 'join "_ApplicationWithApplicant" awa on ';
    query += '  ams."userId" = awa.id ';
    query += 'join "_JobOfferTotalSkills" jotsk on ';
    query += '  jotsk."jobOfferId" = awa."jobOfferId" ';
    query += 'order by ';
    query += '  "matchingRate" desc, ';
    query += '  awa."appliedAt" asc ';
    query += 'offset $2 ';
    query += 'limit $3';

    const rawJobApplications = await this.prismaService.$queryRawUnsafe<Partial<RawJobApplicationDto>[]>(
      query,
      jobOfferId,
      (paginationDto.page - 1) * paginationDto.perPage,
      paginationDto.perPage
    );

    return {
      total: rawJobApplications?.[0]?.totalCount ?? 0,
      data: rawJobApplications.map(rawJobApplication => {
        delete rawJobApplication.totalCount;
        return rawJobApplication;
      })
    }
  }

  findOneJobApplication(jobApplicationId: string) {
    return this.prismaService.jobApplication.findUnique({
      where: { id: jobApplicationId },
      include: {
        applicant: {
          include: {
            skills: true,
            workExperiences: {
              include: { company: true },
            }
          }
        },
        jobOffer: {
          include: { skills: true }
        }
      }
    });
  }
}
