import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { createTestCompany } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { CompanyService } from '@company/company.service';
import { CompanyController } from '@company/company.controller';
import { IsCompanyNameAlreadyExistConstraint } from '@validation/company-name-constraint';
import { CompanyRepository } from '@company/company.repository';
import { CreateCompanyDto } from '@company/create-company.dto';

describe('[POST] /companies (e2e)', () => {
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    PrismaService,
    CompanyService,
    IsCompanyNameAlreadyExistConstraint,
    CompanyRepository
  ];

  const IMPORTS = [];

  const CONTROLLERS = [CompanyController];

  describe('User not authenticated', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => new Promise((resolve, reject) => { throw new UnauthorizedException(); }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: [
          ...PROVIDERS,
          {
            provide: APP_GUARD,
            useValue: mockedAuthGuard,
          }
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(CompanyRepository)
        .useValue({})
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 401', async () => {
      const result = await request(app.getHttpServer())
        .post('/companies')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Name already used', () => {
    const company = createTestCompany();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findOneByName: jest.fn((name: string) => Promise.resolve(company))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findOneByName.mockClear();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: [
          ...PROVIDERS,
          {
            provide: APP_GUARD,
            useValue: mockedAuthGuard,
          }
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(CompanyRepository)
        .useValue(mockedCompanyRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when name is not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/companies')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("name");
    });
    it('Should return 422 when name is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/companies')
        .send({ name: company.name });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneByName.mock.calls[0][0]).toBe(company.name);
      expect(result.body).toHaveProperty("name");
    });
  });

  describe('Validation pass', () => {
    const company = createTestCompany();
    const { id, ...createCompanyDto } = company;
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findOneByName: jest.fn((name: string) => Promise.resolve(null)),
      create: jest.fn((createCompanyDto: CreateCompanyDto) => Promise.resolve(company))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findOneByName.mockClear();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: [
          ...PROVIDERS,
          {
            provide: APP_GUARD,
            useValue: mockedAuthGuard,
          }
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(CompanyRepository)
        .useValue(mockedCompanyRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 201', async () => {
      const result = await request(app.getHttpServer())
        .post('/companies')
        .send({ name: createCompanyDto.name });

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneByName.mock.calls[0][0]).toBe(createCompanyDto.name);
      expect(mockedCompanyRepository.create).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.create.mock.calls[0][0]).toMatchObject({ name: createCompanyDto.name });
      expect(result.body).toMatchObject(company);
    });
  });
});
