import * as util from "util";
import { exec } from "child_process";
import { JobInterviewRepository } from "./job-interview.repository";
import { PrismaService } from "@prisma-module/prisma.service";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { cleanTestDatabase, createTestCompanyDto, createTestingPrismaClient } from "@src/test-utils";
import { Test } from "@nestjs/testing";
import { TestingSearchJobApplication } from "@src/testing-search-job-application";
import { faker } from "@faker-js/faker";

describe('JobInterviewRepository', () => {
  let jobInterviewRepository: JobInterviewRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;
  let TestingPrismaService: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(process.env.TESTING_DATABASE_IMAGE).start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });

    TestingPrismaService = createTestingPrismaClient(container.getConnectionUri());
    await TestingPrismaService.$connect();

    const moduleRef = await Test.createTestingModule({
      providers: [JobInterviewRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    jobInterviewRepository = moduleRef.get<JobInterviewRepository>(JobInterviewRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  describe('findJobInterviewsWhichOverlaps', () => {
    it('Should find one when existingStartedAt lt startedAt and existingEndedAt lt endedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.future({ refDate: startedAt });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.soon({ refDate: startedAt }),
        faker.date.soon({ refDate: endedAt }),
        data.company.id
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(jobInterview.id);
    });
    it('Should find one when existingStartedAt gt startedAt and existingEndedAt lt endedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.soon({ refDate: startedAt, days: 2 });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.recent({ refDate: startedAt }),
        faker.date.soon({ refDate: endedAt }),
        data.company.id
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(jobInterview.id);
    });
    it('Should find one when existingStartedAt gt startedAt and existingEndedAt gt endedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.future({ refDate: startedAt });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.past({ refDate: startedAt }),
        faker.date.recent({ refDate: endedAt }),
        data.company.id
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(jobInterview.id);
    });
    it('Should find one when existingStartedAt lt startedAt and existingEndedAt gt endedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.future({ refDate: startedAt });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.soon({ refDate: startedAt }),
        faker.date.recent({ refDate: endedAt }),
        data.company.id
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(jobInterview.id);
    });
    it('Should not find any when existingStartedAt lt startedAt and existingEndedAt lt startedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.soon({ refDate: startedAt });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.soon({ refDate: endedAt }),
        faker.date.soon({ refDate: endedAt, days: 2 }),
        data.company.id
      );
      expect(result.length).toBe(0);
    });
    it('Should not find any when existingStartedAt gt endedAt and existingEndedAt gt endedAt', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.soon({ refDate: startedAt });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.recent({ refDate: startedAt, days: 2 }),
        faker.date.recent({ refDate: startedAt }),
        data.company.id
      );
      expect(result.length).toBe(0);
    });
    it('Should not find any when overlaps but for another company', async () => {
      const [data, company] = await Promise.all([
        new TestingSearchJobApplication(prismaService).generateData(),
        prismaService.company.create({ data: createTestCompanyDto() })
      ]);
      const startedAt = faker.date.soon();
      const endedAt = faker.date.soon({ refDate: startedAt, days: 3 });
      const jobInterview = await prismaService.jobInterview.create({
        data: {
          jobApplicationId: data.jobApplication1.id,
          startedAt,
          endedAt
        }
      });
      const result = await jobInterviewRepository.findJobInterviewsWhichOverlaps(
        faker.date.soon({ refDate: startedAt }),
        faker.date.recent({ refDate: endedAt }),
        company.id
      );
      expect(result.length).toBe(0);
    });
  });
});
