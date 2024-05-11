import { Test } from '@nestjs/testing';
import { JobApplicationRepository } from './job-application.repository';
import { PrismaService } from '@prisma-module/prisma.service';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { cleanTestDatabase } from '@src/test-utils';
import { generateDataToTestJobOfferSearching } from '@src/test-search-job-offer';
import { JobApplicationStatus } from '@prisma/client';

describe('JobApplicationRepository', () => {
  let jobApplicationRepository: JobApplicationRepository;
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

    const { default: TestingPrismaService } = await import('@src/testing.prisma.service');

    const moduleRef = await Test.createTestingModule({
      providers: [JobApplicationRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    jobApplicationRepository = moduleRef.get<JobApplicationRepository>(JobApplicationRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    await cleanTestDatabase(prismaService);
  });

  afterEach(async () => {
    process.env = originalEnv;
    await prismaService.$disconnect();
  });

  describe('createJobApplication', () => {
    it('Should insert a new jobApplication into the database', async () => {
      const data = await generateDataToTestJobOfferSearching(prismaService);
      const result = await jobApplicationRepository.createJobApplication({
        applicantId: data.talent.id,
        jobOfferId: data.jobOffer1.id
      });
      const jobApplication = await prismaService.jobApplication.findUnique({
        where: { id: result.id }
      });
      expect(jobApplication).not.toBeNull();
      expect(new Date() > jobApplication.appliedAt).toBeTruthy();
      expect(jobApplication.status).toBe(JobApplicationStatus.TO_ASSESS);
      expect(jobApplication.applicantId).toBe(data.talent.id);
      expect(jobApplication.jobOfferId).toBe(data.jobOffer1.id);
    });
  });
});
