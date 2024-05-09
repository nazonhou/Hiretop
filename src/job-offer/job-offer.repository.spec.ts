import { PrismaService } from '@prisma-module/prisma.service';
import { JobOfferRepository } from './job-offer.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { Test } from '@nestjs/testing';
import TestingPrismaService from '@src/testing.prisma.service';
import { cleanTestDatabase, createTestCompanyDto, createTestJobOfferDto, createTestSkillDto, createTestUserDto, createTestWorkExperienceDto } from '@src/test-utils';

describe('JobOfferRepository', () => {
  let jobOfferRepository: JobOfferRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;

  const originalEnv = process.env;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(process.env.TESTING_DATABASE_IMAGE).start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });
  });

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: container.getConnectionUri(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [JobOfferRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    jobOfferRepository = moduleRef.get<JobOfferRepository>(JobOfferRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    await cleanTestDatabase(prismaService);
  });

  afterEach(async () => {
    process.env = originalEnv;
    await prismaService.$disconnect();
  });

  describe('createJobOffer', () => {
    it('Should insert a new jobOffer into the database', async () => {
      const [user, company] = await Promise.all([
        prismaService.user.create({ data: createTestUserDto() }),
        prismaService.company.create({ data: createTestCompanyDto() }),
      ]);
      const skill = await prismaService.skill.create({ data: { ...createTestSkillDto(), authorId: user.id } });
      const result = await jobOfferRepository.createJobOffer(
        user.id,
        company.id,
        createTestJobOfferDto([skill.id])
      );

      const jobOffer = await prismaService.jobOffer.findUnique({ where: { id: result.id } });
      expect(jobOffer).not.toBeNull();
      expect(jobOffer).toMatchObject(result);
      expect(jobOffer.authorId).toBe(user.id);
      expect(jobOffer.companyId).toBe(company.id);
    });
  });
});
