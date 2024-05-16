import { PrismaClient } from "@prisma/client";
import * as bcrypt from 'bcrypt';
import { createTestCompanyDto, createTestJobOfferDto, createTestSkillDto, createTestUserDto, createTestWorkExperienceDto } from "./test-utils";
import { faker } from "@faker-js/faker";
const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS);

export class TestingUserFindJobApplicationsSeed {
  constructor(private prismaClient: PrismaClient) {}
  generateData() {
    return this.prismaClient.$transaction(async tx => {
      // create companies
      const [company1, company2, company3] = await Promise.all([
        tx.company.create({ data: createTestCompanyDto() }),
        tx.company.create({ data: createTestCompanyDto() }),
        tx.company.create({ data: createTestCompanyDto() }),
      ])

      // create talent companyUser1,2 and 3
      const password = await bcrypt.hash("password", saltRounds);
      const [talent, companyUser1, companyUser2, companyUser3] = await Promise.all([
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'talent@hiretop.io',
            password
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'company1.user@hiretop.io',
            password,
            companyUser: { create: { companyId: company1.id } }
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'company2.user@hiretop.io',
            password,
            companyUser: { create: { companyId: company2.id } }
          }
        }),
        tx.user.create({
          data: {
            ...createTestUserDto(),
            email: 'company3.user@hiretop.io',
            password,
            companyUser: { create: { companyId: company3.id } }
          }
        }),
      ]);
      // create skill1, skill2 and skill3
      const [skill1, skill2, skill3] = await Promise.all([
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_1', authorId: companyUser1.id } }),
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_2', authorId: companyUser2.id } }),
        tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_3', authorId: companyUser3.id } }),
      ]);
      // associate talent1-->(skill1 & skill2)
      await Promise.all([
        tx.user.update({
          where: { id: talent.id },
          data: {
            skills: {
              connect: [{ id: skill1.id }, { id: skill2.id }]
            }
          }
        })
      ]);
      // create jobOffer1-->(skill 1&2), jobOffer2-->(skill 2&3), , jobOffer3-->(skill 1&3)
      const { skillIds: jobOffer1SkillIds, ...jobOffer1Dto } = createTestJobOfferDto([skill1.id, skill2.id]);
      const { skillIds: jobOffer2SkillIds, ...jobOffer2Dto } = createTestJobOfferDto([skill2.id, skill3.id]);
      const { skillIds: jobOffer3SkillIds, ...jobOffer3Dto } = createTestJobOfferDto([skill1.id, skill3.id]);
      const [jobOffer1, jobOffer2, jobOffer3] = await Promise.all([
        tx.jobOffer.create({
          data: {
            ...jobOffer1Dto,
            description: 'JOB_OFFER_1',
            postedAt: faker.date.recent(),
            company: { connect: { id: company1.id } },
            author: { connect: { id: companyUser1.id } },
            skills: { connect: jobOffer1SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
        tx.jobOffer.create({
          data: {
            ...jobOffer2Dto,
            description: 'JOB_OFFER_2',
            postedAt: faker.date.recent(),
            company: { connect: { id: company2.id } },
            author: { connect: { id: companyUser2.id } },
            skills: { connect: jobOffer2SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
        tx.jobOffer.create({
          data: {
            ...jobOffer3Dto,
            description: 'JOB_OFFER_3',
            postedAt: faker.date.recent(),
            company: { connect: { id: company3.id } },
            author: { connect: { id: companyUser3.id } },
            skills: { connect: jobOffer3SkillIds.map(skillId => ({ id: skillId })) }
          }
        }),
      ]);

      // create
      // jobApplication1-->(talent, jobOffer1), 
      // jobApplication2-->(talent, jobOffer2), 
      // jobApplication3-->(talent, jobOffer3)
      const [jobApplication1, jobApplication2, jobApplication3] = await Promise.all([
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer1.id } },
            applicant: { connect: { id: talent.id } }
          }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer2.id } },
            applicant: { connect: { id: talent.id } }
          }
        }),
        tx.jobApplication.create({
          data: {
            jobOffer: { connect: { id: jobOffer3.id } },
            applicant: { connect: { id: talent.id } }
          }
        })
      ]);

      // create workExperience1-->(talent1), workExperience2-->(talent2), workExperience3-->(talent3)
      const { companyId: workExperience1CompanyId, ...workExperience1Dto } = createTestWorkExperienceDto(company1.id);
      const { companyId: workExperience2CompanyId, ...workExperience2Dto } = createTestWorkExperienceDto(company1.id);
      const { companyId: workExperience3CompanyId, ...workExperience3Dto } = createTestWorkExperienceDto(company1.id);
      const [workExperience1] = await Promise.all([
        tx.workExperience.create({
          data: {
            ...workExperience1Dto,
            user: { connect: { id: talent.id } },
            company: { connect: { id: workExperience1CompanyId } }
          }
        }),
      ])

      return {
        company1,
        company2,
        company3,
        talent,
        companyUser1,
        companyUser2,
        companyUser3,
        skill1,
        skill2,
        skill3,
        jobOffer1,
        jobOffer2,
        jobOffer3,
        jobApplication1,
        jobApplication2,
        jobApplication3,
        workExperience1
      }
    });
  }
}
