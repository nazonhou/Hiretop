import { CreateTalentDto } from "@user/create-talent.dto";
import { faker } from '@faker-js/faker';
import { Company, CompanyCategory, JobApplication, JobApplicationStatus, JobOffer, JobType, LocationType, Role, User, WorkExperience } from '@prisma/client';
import { CreateCompanyDto } from "@company/create-company.dto";
import { CreateCompanyUserDto } from "@user/create-company-user.dto";
import { UpdateProfileDto } from "@user/update-profile-dto";
import { TokenPayload } from "@auth/auth.service";
import { Request, Response, NextFunction } from 'express';
import { CreateSkillDto } from "@skill/create-skill.dto";
import { UpdateSkillsDto } from "@user/update-skills.dto";
import { CreateWorkExperienceDto } from "@work-experience/create-work-experience.dto";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateJobOfferDto } from "@job-offer/create-job-offer.dto";
import { RawJobOfferDto } from "@job-offer/raw-job-offer.dto";
import { SearchJobOfferDto } from "@job-offer/search-job-offer.dto";

export function createTestUserDto(): CreateTalentDto {
  const dto = new CreateTalentDto();
  dto.address = faker.location.streetAddress();
  dto.birthday = faker.date.birthdate();
  dto.email = faker.internet.email();
  dto.name = faker.person.fullName();
  dto.phoneNumber = faker.string.numeric({ length: { min: 8, max: 10 } }),
    dto.password = faker.internet.password();
  return dto;
}

export function createTestUser(): User {
  return {
    id: faker.string.uuid(),
    address: faker.location.streetAddress(),
    birthday: faker.date.birthdate(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    phoneNumber: faker.string.numeric({ length: { min: 8, max: 10 } }),
    password: faker.internet.password(),
  };
}

export function createTestCompanyDto() {
  const createCompanyDto = new CreateCompanyDto();
  createCompanyDto.culture = faker.lorem.paragraph();
  createCompanyDto.history = faker.lorem.paragraph();
  createCompanyDto.presentation = faker.lorem.paragraph();
  createCompanyDto.values = [faker.lorem.paragraph()];
  createCompanyDto.name = faker.company.name();
  createCompanyDto.category = faker.helpers.enumValue(CompanyCategory);
  return createCompanyDto;
}

export function createCompanyUserDto(): CreateCompanyUserDto {
  const { name: companyName, ...partialCreateCompanyDto } = createTestCompanyDto();
  return {
    ...createTestUserDto(),
    ...partialCreateCompanyDto,
    companyName
  }
}

export function createTestCompany(): Company {
  return {
    id: faker.string.uuid(),
    culture: faker.lorem.paragraph(),
    history: faker.lorem.paragraph(),
    presentation: faker.lorem.paragraph(),
    name: faker.company.name(),
    values: [faker.company.buzzPhrase()],
    category: faker.helpers.enumValue(CompanyCategory)
  };
}

export function createUpdateProfileDto(): UpdateProfileDto {
  const { email, password, ...updateProdileDto } = createTestUserDto();
  return updateProdileDto;
}

export function authenticationMiddleware(payload: TokenPayload) {
  return (req: Request, res: Response, next: NextFunction) => {
    req['user'] = payload;
    next();
  };
}

export function createTestSkillDto(): CreateSkillDto {
  const createSkillDto = new CreateSkillDto();
  createSkillDto.name = faker.person.jobType();
  return createSkillDto;
}

export function createTestSkill() {
  return { ...createTestSkillDto(), id: faker.string.uuid(), authorId: faker.string.uuid() };
}

export function createAuthenticated(options?: {
  roles?: Role[], company?: { id: string, name: string }
}): TokenPayload {
  const payload: TokenPayload = {
    email: faker.internet.email(),
    sub: faker.string.uuid(),
    roles: options?.roles ?? []
  };
  if (options?.company) {
    payload.company = options.company;
  }
  return payload;
}

export function createTestUpdateSkillsDto(): UpdateSkillsDto {
  return { skillIds: [faker.string.uuid()] };
}

export function createTestWorkExperienceDto(companyId: string): CreateWorkExperienceDto {
  const createWorkExperienceDto = new CreateWorkExperienceDto();
  createWorkExperienceDto.description = faker.lorem.paragraph();
  createWorkExperienceDto.location = faker.location.city();
  createWorkExperienceDto.locationType = faker.helpers.enumValue(LocationType);
  createWorkExperienceDto.title = faker.person.jobTitle();
  createWorkExperienceDto.type = faker.helpers.enumValue(JobType);
  createWorkExperienceDto.startedAt = faker.date.past();
  createWorkExperienceDto.endedAt = faker.date.future({ refDate: createWorkExperienceDto.startedAt });
  createWorkExperienceDto.companyId = companyId;
  return createWorkExperienceDto;
}

export function createTestWorkExperience(): WorkExperience {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    companyId: faker.string.uuid(),
    description: faker.lorem.paragraph(),
    location: faker.location.city(),
    locationType: faker.helpers.enumValue(LocationType),
    title: faker.person.jobTitle(),
    type: faker.helpers.enumValue(JobType),
    startedAt: faker.date.recent(),
    endedAt: faker.date.soon(),
  };
}

export function cleanTestDatabase(prismaService: PrismaService) {
  return prismaService.$transaction([
    prismaService.skill.deleteMany(),
    prismaService.companyUser.deleteMany(),
    prismaService.jobOffer.deleteMany(),
    prismaService.roleUser.deleteMany(),
    prismaService.workExperience.deleteMany(),
    prismaService.jobOffer.deleteMany(),
    prismaService.company.deleteMany(),
    prismaService.user.deleteMany()
  ]);
}

export function createTestJobOfferDto(skillIds: string[]): CreateJobOfferDto {
  const createJobOfferDto = new CreateJobOfferDto();
  createJobOfferDto.expiredAt = faker.date.soon();
  createJobOfferDto.locationType = faker.helpers.enumValue(LocationType);
  createJobOfferDto.skillIds = skillIds;
  createJobOfferDto.type = faker.helpers.enumValue(JobType);
  createJobOfferDto.description = faker.lorem.paragraph();
  return createJobOfferDto;
}

export function createTestJobOffer(): JobOffer {
  return {
    authorId: faker.string.uuid(),
    companyId: faker.string.uuid(),
    expiredAt: faker.date.soon(),
    id: faker.string.uuid(),
    locationType: faker.helpers.enumValue(LocationType),
    postedAt: faker.date.recent(),
    type: faker.helpers.enumValue(JobType),
    description: faker.lorem.paragraph()
  }
}

export function createTestRawJobOfferDto(): RawJobOfferDto {
  return {
    author_id: faker.string.uuid(),
    company_category: faker.helpers.enumValue(CompanyCategory),
    company_id: faker.string.uuid(),
    company_name: faker.company.name(),
    description: faker.lorem.paragraph(),
    expired_at: faker.date.soon(),
    id: faker.string.uuid(),
    location_type: faker.helpers.enumValue(LocationType),
    matched_skills: faker.number.int(),
    matching_rate: faker.number.int(),
    posted_at: faker.date.recent(),
    total_count: faker.number.int(),
    total_skills: faker.number.int(),
    type: faker.helpers.enumValue(JobType)
  };
}

export function createTestSearchJobOfferDto(): SearchJobOfferDto {
  return {
    page: faker.number.int(),
    perPage: faker.number.int(),
    companyCategory: faker.helpers.enumValue(CompanyCategory),
    jobType: faker.helpers.enumValue(JobType),
    locationType: faker.helpers.enumValue(LocationType),
  }
}

export function createTestJobOfferData(options: { userId: string }) {
  return {
    description: faker.lorem.paragraph(),
    expiredAt: faker.date.soon(),
    postedAt: faker.date.recent(),
    author: { connect: { id: options.userId } },
    company: { create: createTestCompanyDto() },
    locationType: faker.helpers.enumValue(LocationType),
    type: faker.helpers.enumValue(JobType),
    skills: { create: [{ ...createTestSkillDto(), author: { connect: { id: options.userId } } }] }
  };
}

export function createTestJobApplication(): JobApplication {
  return {
    applicantId: faker.string.uuid(),
    appliedAt: faker.date.recent(),
    id: faker.string.uuid(),
    jobOfferId: faker.string.uuid(),
    status: faker.helpers.enumValue(JobApplicationStatus)
  }
}