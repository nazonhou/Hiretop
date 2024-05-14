import { PrismaService } from '@prisma-module/prisma.service';
import { CompanyRepository } from './company.repository';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import * as util from "util";
import { cleanTestDatabase, createTestCompanyDto, createTestUser, createTestingPrismaClient } from '@src/test-utils';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

describe('CompanyRepository', () => {
  let companyRepository: CompanyRepository;
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
      providers: [CompanyRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    companyRepository = moduleRef.get<CompanyRepository>(CompanyRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  describe("create method", () => {
    it('should insert company into database', async () => {
      const createCompanyDto = createTestCompanyDto();

      expect(await prismaService.company.count()).toBe(0);
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

  describe("findOneById method", () => {
    it('should return a company if id exists', async () => {
      const company = await prismaService.company.create({ data: createTestCompanyDto() });
      const result = await companyRepository.findOneById(company.id);
      expect(result.id).not.toBeNull();
      expect(result).toMatchObject(company);
    });
    it('should return null if id is not a reference to a real company record', async () => {
      const company = await prismaService.company.create({ data: createTestCompanyDto() });
      const result = await companyRepository.findOneById(faker.string.uuid());
      expect(result).toBeNull();
    });
    it('should throw an exception when id is not a uuid', async () => {
      expect(companyRepository.findOneById("FAKE_ID")).rejects.toThrow();
    });
  });

  describe("findByNameStartsWith", () => {
    it('should not find any company when input does not match', async () => {
      const company = await prismaService.company.create({
        data:
          { ...createTestCompanyDto(), name: 'Company_1' }
      });
      const result = await companyRepository.findByNameStartsWith('FAKE', { page: 1, perPage: 1 });
      expect(result.length).toBe(0);
    });
    it('should find the companies with the right order', async () => {
      await prismaService.company.createMany({
        data: [
          { ...createTestCompanyDto(), name: 'Company_2' },
          { ...createTestCompanyDto(), name: 'Company_3' },
          { ...createTestCompanyDto(), name: 'Company_1' },
        ]
      });
      const result = await companyRepository.findByNameStartsWith('Company', { page: 1, perPage: 3 });
      expect(result.length).toBe(3);
      expect(result[0].name).toBe('Company_1');
      expect(result[1].name).toBe('Company_2');
      expect(result[2].name).toBe('Company_3');
    });
    it('should find the companies with the right order and right pagination', async () => {
      await prismaService.company.createMany({
        data: [
          { ...createTestCompanyDto(), name: 'Company_2' },
          { ...createTestCompanyDto(), name: 'Company_3' },
          { ...createTestCompanyDto(), name: 'Company_1' },
        ]
      });
      const result = await companyRepository.findByNameStartsWith('Company', { page: 2, perPage: 1 });
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Company_2');
    });
  });

});
