import { faker } from "@faker-js/faker";
import { PrismaClient } from "@prisma/client";
import { createTestCompanyDto, createTestJobOfferDto, createTestSkillDto, createTestUserDto } from "@src/test-utils";
import * as bcrypt from 'bcrypt';
const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS);

export async function generateDataToTestJobOfferSearching(
  prisma: PrismaClient,
) {
  return prisma.$transaction(async (tx) => {
    // clean the database first
    await tx.skill.deleteMany();
    await tx.companyUser.deleteMany();
    await tx.jobOffer.deleteMany();
    await tx.roleUser.deleteMany();
    await tx.workExperience.deleteMany();
    await tx.jobOffer.deleteMany();
    await tx.company.deleteMany();
    await tx.user.deleteMany();
    // create company
    const company = await tx.company.create({ data: createTestCompanyDto() });
    // create talent and companyUser
    const password = await bcrypt.hash("password", saltRounds);
    const [talent, companyUser] = await Promise.all([
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
          email: 'company.user@hiretop.io',
          password,
          companyUser: { create: { companyId: company.id } }
        }
      }),
    ]);
    // create skill1, skill2 and skill3
    const [skill1, skill2, skill3] = await Promise.all([
      tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_1', authorId: companyUser.id } }),
      tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_2', authorId: companyUser.id } }),
      tx.skill.create({ data: { ...createTestSkillDto(), name: 'SKILL_3', authorId: companyUser.id } }),
    ]);
    // associate skill1 and skill2 to talent
    await tx.user.update({
      where: { id: talent.id },
      data: {
        skills: {
          connect: [{ id: skill1.id }, { id: skill2.id }]
        }
      }
    })
    // create jobOffer1-->(skill 1&2), jobOffer2-->(skill 2&3) and jobOffer3-->(skill 3)
    const { skillIds: jobOffer1SkillIds, ...jobOffer1Dto } = createTestJobOfferDto([skill1.id, skill2.id]);
    const { skillIds: jobOffer2SkillIds, ...jobOffer2Dto } = createTestJobOfferDto([skill2.id, skill3.id]);
    const { skillIds: jobOffer3SkillIds, ...jobOffer3Dto } = createTestJobOfferDto([skill3.id]);
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

    return {
      company,
      talent,
      companyUser,
      skill1,
      skill2,
      skill3,
      jobOffer1,
      jobOffer2,
      jobOffer3
    }
  });
}