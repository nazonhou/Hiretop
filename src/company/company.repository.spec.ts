import { PrismaService } from '@prisma-module/prisma.service';
import { CompanyRepository } from './company.repository';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import * as util from "util";
import { createTestCompanyDto, createTestUser } from '@src/test-utils';

describe('CompanyRepository', () => {
  let companyRepository: CompanyRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;

  const originalEnv = process.env;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });
  });

  afterAll(async () => {
    await container.stop();
  })

  beforeEach(async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: container.getConnectionUri(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [CompanyRepository, PrismaService],
    }).compile();

    companyRepository = moduleRef.get<CompanyRepository>(CompanyRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    await prismaService.$transaction([
      prismaService.companyUser.deleteMany(),
      prismaService.company.deleteMany()
    ]);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(companyRepository).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  describe("create method", () => {
    it('should insert company into database', async () => {
      const createCompanyDto = createTestCompanyDto();

      const result = await companyRepository.create(createCompanyDto);
      expect(await prismaService.company.count()).toBe(1);
      expect(await prismaService.company.findUnique({ where: { id: result.id } })).not.toBeNull();
    });
  });

  describe("createCompanyUser method", () => {
    it('should insert companyUser into database', async () => {
      const company = await prismaService.company.create({ data: createTestCompanyDto() });
      const user = await prismaService.user.create({ data: createTestUser() });

      await companyRepository.createCompanyUser(user.id, company.id);
      expect(await prismaService.companyUser.count()).toBe(1);
      expect(await prismaService.companyUser.findUnique({ where: { companyId: company.id, userId: user.id } })).not.toBeNull();
    });
  });

  describe("findOneByName method", () => {
    it('should return a company if name exists', async () => {
      const company = await prismaService.company.create({ data: createTestCompanyDto() });
      const result = await companyRepository.findOneByName(company.name);
      expect(result.id).not.toBeNull();
      expect(result.id).toBe(company.id);
    });
    it('should return null if name does not exists', async () => {
      const company = await prismaService.company.create({ data: createTestCompanyDto() });
      const result = await companyRepository.findOneByName("FakeCompanyName");
      expect(result).toBeNull();
    });
  });

});
