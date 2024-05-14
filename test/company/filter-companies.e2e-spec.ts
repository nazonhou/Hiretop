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
import { PaginationDto } from '@src/pagination.dto';
import { faker } from '@faker-js/faker';
import { FilterCompanyDto } from '@company/filter-company.dto';

describe('[GET] /companies/filters (e2e)', () => {
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
        .get('/companies/filters');

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation fail', () => {
    const company = createTestCompany();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findByNameStartsWith: jest.fn((startsWith: string, paginationDto: PaginationDto) => Promise.resolve([company]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findByNameStartsWith.mockClear();

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

    it('Should return 422 when name, perPage and page are not sent', async () => {
      const result = await request(app.getHttpServer())
        .get('/companies/filters');

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findByNameStartsWith).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty("name");
      expect(result.body).toHaveProperty("perPage");
      expect(result.body).toHaveProperty("page");
    });
    it('Should return 422 when perPage and page are not numbers', async () => {
      const result = await request(app.getHttpServer())
        .get('/companies/filters')
        .query({ perPage: faker.lorem.word(), page: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findByNameStartsWith).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty("perPage");
      expect(result.body).toHaveProperty("page");
    });
  });

  describe('Validation pass', () => {
    const company = createTestCompany();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findByNameStartsWith: jest.fn((startsWith: string, paginationDto: PaginationDto) => Promise.resolve([company]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findByNameStartsWith.mockClear();

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

    it('Should return 200', async () => {
      const filterCompanyDto: FilterCompanyDto = {
        name: company.name, perPage: faker.number.int(), page: faker.number.int()
      };
      const result = await request(app.getHttpServer())
        .get('/companies/filters')
        .query(filterCompanyDto);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findByNameStartsWith).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findByNameStartsWith.mock.calls[0][0]).toBe(filterCompanyDto.name);
      expect(mockedCompanyRepository.findByNameStartsWith.mock.calls[0][1]).toMatchObject(
        { page: filterCompanyDto.page, perPage: filterCompanyDto.perPage }
      );
      expect(result.body.length).toBe(1);
      expect(result.body[0]).toMatchObject(company);
    });
  });
});
