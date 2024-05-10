import { PrismaService } from '@prisma-module/prisma.service';
import { WorkExperienceRepository } from './work-experience.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { Test } from '@nestjs/testing';
import { cleanTestDatabase, createTestCompanyDto, createTestUserDto, createTestWorkExperienceDto } from '@src/test-utils';

describe('WorkExperienceRepository', () => {
  let workExperienceRepository: WorkExperienceRepository;
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
      providers: [WorkExperienceRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    workExperienceRepository = moduleRef.get<WorkExperienceRepository>(WorkExperienceRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    await cleanTestDatabase(prismaService);
  });

  afterEach(async () => {
    process.env = originalEnv;
    await prismaService.$disconnect();
  });

  describe('createWorkExperience', () => {
    it('Should insert a new work experience into the database', async () => {
      const [user, company] = await Promise.all([
        prismaService.user.create({ data: createTestUserDto() }),
        prismaService.company.create({ data: createTestCompanyDto() })
      ]);
      const result = await workExperienceRepository.createWorkExperience(
        user.id,
        createTestWorkExperienceDto(company.id)
      );

      const workExperience = await prismaService.workExperience.findUnique({ where: { id: result.id } });
      expect(workExperience).not.toBeNull();
      expect(workExperience).toMatchObject(result);
      expect(workExperience.userId).toBe(user.id);
      expect(workExperience.companyId).toBe(company.id);
    });
  });
});
