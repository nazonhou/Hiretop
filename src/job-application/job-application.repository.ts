import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma-module/prisma.service';
import { CreateJobApplicationDto } from './create-job-application.dto';
import { PaginationDto } from '@src/pagination.dto';
import { RawJobApplicationDto } from './raw-job-application.dto';
import { JobApplicationDto } from './job-application.dto';
import { RejectJobApplicationDto } from './reject-job-application.dto';
import { JobApplicationStatus } from '@prisma/client';
import { AcceptJobApplicationDto } from './accept-job-application.dto';
import { JobApplicationEntity } from './job-application.entity';
import { GetJobApplicationsResponseDto } from './get-job-applications.response.dto';
import { GetOneJobApplicationResponseDto } from './get-one-job-application.response.dto';
import { UserDto } from '@user/user.dto';
import { RejectJobApplicationResponseDto } from './reject-job-application.response.dto';
import { AcceptJobApplicationResponseDto } from './accept-job-application.response.dto';

@Injectable()
export class JobApplicationRepository {
  constructor(private prismaService: PrismaService) {}

  createJobApplication(
    { applicantId, jobOfferId }: CreateJobApplicationDto
  ): Promise<JobApplicationEntity> {
    return this.prismaService.jobApplication.create({
      data: { applicantId, jobOfferId }
    });
  }

  async findApplicationsByJobOfferId(
    jobOfferId: string,
    paginationDto: PaginationDto
  ): Promise<GetJobApplicationsResponseDto> {
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

  async findOneJobApplication(jobApplicationId: string) {
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

  rejectJobApplication(
    jobApplicationId: string,
    rejectJobApplicationDto: RejectJobApplicationDto
  ): Promise<RejectJobApplicationResponseDto> {
    return this.prismaService.jobApplication.update({
      where: { id: jobApplicationId },
      data: {
        status: JobApplicationStatus.REJECTED,
        applicationFeedback: {
          create: {
            message: rejectJobApplicationDto.message
          }
        }
      },
      include: { applicationFeedback: true }
    });
  }

  acceptJobApplication(
    jobApplicationId: string,
    acceptJobApplicationDto: AcceptJobApplicationDto
  ): Promise<AcceptJobApplicationResponseDto> {
    return this.prismaService.jobApplication.update({
      where: { id: jobApplicationId },
      data: {
        status: JobApplicationStatus.ACCEPTED,
        applicationFeedback: {
          create: {
            message: acceptJobApplicationDto.message
          }
        },
        jobInterview: {
          create: {
            endedAt: acceptJobApplicationDto.endedAt,
            startedAt: acceptJobApplicationDto.startedAt
          }
        }
      },
      include: {
        applicationFeedback: true,
        jobInterview: true
      }
    });
  }

  findApplicationsByApplicantId(
    applicantId: string,
    { page, perPage }: PaginationDto
  ) {
    return Promise.all([
      this.prismaService.jobApplication.findMany({
        where: { applicantId },
        include: {
          applicationFeedback: true,
          jobInterview: true,
          jobOffer: { include: { company: true, skills: true } }
        },
        orderBy: { appliedAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prismaService.jobApplication.count({
        where: { applicantId }
      })
    ]);
  }
}
