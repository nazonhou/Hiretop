import { PrismaService } from '@prismaModule/prisma.service';
import { CompanyRepository } from './company.repository';
import { Test } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import * as util from "util";
import { faker } from '@faker-js/faker';
import { CreateCompanyDto } from './create-company.dto';

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

  it('create should insert company into database', async () => {
    expect(companyRepository).toBeDefined();
    expect(prismaService).toBeDefined();

    const createCompanyDto = new CreateCompanyDto();
    createCompanyDto.culture = faker.lorem.paragraph();
    createCompanyDto.history = faker.lorem.paragraph();
    createCompanyDto.presentation = faker.lorem.paragraph();
    createCompanyDto.values = faker.lorem.paragraph();

    const result = await companyRepository.create(createCompanyDto);    
    expect(await prismaService.company.count()).toBe(1);
    expect(await prismaService.company.findUnique({ where: { id: result.id } })).not.toBeNull();
  });
});
