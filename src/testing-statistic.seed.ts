import { JobApplicationStatus, PrismaClient, Role } from "@prisma/client";
import * as bcrypt from 'bcrypt';
import { createTestAcceptJobApplicationDto, createTestCompanyDto, createTestJobOfferDto, createTestSkillDto, createTestUserDto, createTestWorkExperienceDto } from "./test-utils";
import { faker } from "@faker-js/faker";
const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS);

export class TestingStatisticSeed {
  constructor(private readonly prismaClient: PrismaClient) {}

  generateData() {
    return this.prismaClient.$transaction(async tx => {
      // create company
      const [company] = await Promise.all([
        tx.company.create({ data: createTestCompanyDto() }),
      ])

      // create talent1,2,3 and companyUser
      const password = await bcrypt.hash("password", saltRounds);
      const [talent1, talent2, talent3, companyUser] = await Promise.all([
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'talent1@hiretop.io',
            password
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'talent2@hiretop.io',
            password
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'talent3@hiretop.io',
            password
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'company.user@hiretop.io',
            password,
            companyUser: { create: { companyId: company.id } },
            rolesUser: { create: [{ role: Role.COMPANY }] }
          }
        }),
      ]);
      // create skill1, skill2 and skill3
      const [skill1, skill2, skill3] = await Promise.all([
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_1', authorId: companyUser.id } }),
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_2', authorId: companyUser.id } }),
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_3', authorId: companyUser.id } }),
      ]);
      // associate talent1-->(skill 1&3) | talent2-->(skill 1&2&3) | talent3-->(skill 2&3)
      await Promise.all([
        tx.user.update({
          where: { id: talent1.id },
          data: {
            skills: {
              connect: [{ id: skill1.id }, { id: skill3.id }]
            }
          }
        }),
        tx.user.update({
          where: { id: talent2.id },
          data: {
            skills: {
              connect: [{ id: skill1.id }, { id: skill2.id }, { id: skill3.id }]
            }
          }
        }),
        tx.user.update({
          where: { id: talent3.id },
          data: {
            skills: {
              connect: [{ id: skill2.id }, { id: skill3.id }]
            }
          }
        })
      ]);
      // create jobOffer1-->(skill 1&2), jobOffer2-->(skill 1&3), , jobOffer3-->(skill 2&3)
      const { skillIds: jobOffer1SkillIds, ...jobOffer1Dto } = createTestJobOfferDto([skill1.id, skill2.id]);
      const { skillIds: jobOffer2SkillIds, ...jobOffer2Dto } = createTestJobOfferDto([skill1.id, skill3.id]);
      const { skillIds: jobOffer3SkillIds, ...jobOffer3Dto } = createTestJobOfferDto([skill2.id, skill3.id]);
      const [jobOffer1, jobOffer2, jobOffer3] = await Promise.all([
        tx.jobOffer.create({
          data: {
            ...jobOffer1Dto,
            description: 'JOB_OFFER_1',
            postedAt: faker.date.recent(),
            company: { connect: { id: company.id } },
            author: { connect: { id: companyUser.id } },
            skills: { connect: jobOffer1SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
        tx.jobOffer.create({
          data: {
            ...jobOffer2Dto,
            description: 'JOB_OFFER_2',
            postedAt: faker.date.recent(),
            company: { connect: { id: company.id } },
            author: { connect: { id: companyUser.id } },
            skills: { connect: jobOffer2SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
        tx.jobOffer.create({
          data: {
            ...jobOffer3Dto,
            description: 'JOB_OFFER_3',
            postedAt: faker.date.recent(),
            company: { connect: { id: company.id } },
            author: { connect: { id: companyUser.id } },
            skills: { connect: jobOffer3SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
      ]);

      // create
      // jobApplication1-->(talent1, jobOffer1) [Accepted], jobApplication2-->(talent1, jobOffer2) [Rejected]
      // jobApplication3-->(talent2, jobOffer2) [Accepted], jobApplication4-->(talent2, jobOffer3) [Pending]
      // jobApplication5-->(talent3, jobOffer3) [Pending], jobApplication6-->(talent3, jobOffer1) [Rejected]
      const [
        jobApplication1,
        jobApplication2,
        jobApplication3,
        jobApplication4,
        jobApplication5,
        jobApplication6
      ] = await Promise.all([
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer1.id } },
            applicant: { connect: { id: talent1.id } },
            status: JobApplicationStatus.ACCEPTED,
            applicationFeedback: { create: { message: faker.lorem.text() } },
            jobInterview: { create: { startedAt: faker.date.soon(), endedAt: new Date(faker.date.soon().getTime() + 2 * 60 * 60 * 1000) } }
          },
          include: { applicationFeedback: true, jobInterview: true }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer2.id } },
            applicant: { connect: { id: talent1.id } },
            status: JobApplicationStatus.REJECTED,
            applicationFeedback: { create: { message: faker.lorem.text() } },
          },
          include: { applicationFeedback: true, jobInterview: true }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer2.id } },
            applicant: { connect: { id: talent2.id } },
            status: JobApplicationStatus.ACCEPTED,
            applicationFeedback: { create: { message: faker.lorem.text() } },
            jobInterview: { create: { startedAt: faker.date.soon(), endedAt: new Date(faker.date.soon().getTime() + 2 * 60 * 60 * 1000) } }
          },
          include: { applicationFeedback: true, jobInterview: true }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer3.id } },
            applicant: { connect: { id: talent2.id } }
          }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer3.id } },
            applicant: { connect: { id: talent3.id } }
          }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer1.id } },
            applicant: { connect: { id: talent3.id } },
            status: JobApplicationStatus.REJECTED,
            applicationFeedback: { create: { message: faker.lorem.text() } },
          },
          include: { applicationFeedback: true, jobInterview: true }
        })
      ]);

      // create workExperience1-->(talent1), workExperience2-->(talent2), workExperience3-->(talent3)
      const { companyId: workExperience1CompanyId, ...workExperience1Dto } = createTestWorkExperienceDto(company.id);
      const { companyId: workExperience2CompanyId, ...workExperience2Dto } = createTestWorkExperienceDto(company.id);
      const { companyId: workExperience3CompanyId, ...workExperience3Dto } = createTestWorkExperienceDto(company.id);
      const [workExperience1, workExperience2, workExperience3] = await Promise.all([
        tx.workExperience.create({
          data: {
            ...workExperience1Dto,
            user: { connect: { id: talent1.id } },
            company: { connect: { id: workExperience1CompanyId } }
          }
        }),
        tx.workExperience.create({
          data: {
            ...workExperience2Dto,
            user: { connect: { id: talent2.id } },
            company: { connect: { id: workExperience2CompanyId } }
          }
        }),
        tx.workExperience.create({
          data: {
            ...workExperience3Dto,
            user: { connect: { id: talent3.id } },
            company: { connect: { id: workExperience3CompanyId } }
          }
        }),
      ])

      return {
        company,
        talent1,
        talent2,
        talent3,
        companyUser,
        skill1,
        skill2,
        skill3,
        jobOffer1,
        jobOffer2,
        jobOffer3,
        jobApplication1,
        jobApplication2,
        jobApplication3,
        jobApplication4,
        jobApplication5,
        jobApplication6,
        workExperience1,
        workExperience2,
        workExperience3
      }
    });
  }
}
