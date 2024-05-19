import { JobOfferWithSkillsDto } from "@job-offer/job-offer-with-skills.dto";
import { ApiProperty } from "@nestjs/swagger";
import { $Enums, Company, JobApplication, JobOffer, Skill, User, WorkExperience } from "@prisma/client";
import { UserWithSkillsAndWorkExperiencesDto } from "@user/user-with-skills-and-work-experiences.dto";

export class GetOneJobApplicationResponseDto
  implements JobApplication {
  applicantId: string;
  appliedAt: Date;
  id: string;
  jobOfferId: string;
  @ApiProperty({ enum: $Enums.JobApplicationStatus })
  status: $Enums.JobApplicationStatus;
  @ApiProperty({ type: UserWithSkillsAndWorkExperiencesDto })
  applicant: UserWithSkillsAndWorkExperiencesDto;
  @ApiProperty({ type: JobOfferWithSkillsDto })
  jobOffer: JobOfferWithSkillsDto;

  static fromJobApplicationWithJobOfferAndApplicant(
    jobApplication: JobApplication
      & { jobOffer: JobOffer & { skills: Skill[] } }
      & { applicant: User & { skills: Skill[], workExperiences: (WorkExperience & { company: Company })[] } }
  ): GetOneJobApplicationResponseDto {
    const { password, ...applicant } = jobApplication.applicant;

    const jobApplicationResponseDto = new GetOneJobApplicationResponseDto();
    jobApplicationResponseDto.applicantId = jobApplication.applicantId;
    jobApplicationResponseDto.appliedAt = jobApplication.appliedAt;
    jobApplicationResponseDto.id = jobApplication.id;
    jobApplicationResponseDto.jobOffer = jobApplication.jobOffer;
    jobApplicationResponseDto.jobOfferId = jobApplication.jobOfferId;
    jobApplicationResponseDto.status = jobApplication.status;
    jobApplicationResponseDto.applicant = applicant;

    return jobApplicationResponseDto;
  }
}
