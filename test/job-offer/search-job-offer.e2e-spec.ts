import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestJobOffer, createTestJobOfferDto, createTestRawJobOfferDto, createTestSearchJobOfferDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { Role } from '@prisma/client';
import { JobOfferService } from '@job-offer/job-offer.service';
import { JobOfferRepository } from '@job-offer/job-offer.repository';
import { JobOfferController } from '@job-offer/job-offer.controller';
import { RolesGuard } from '@auth/roles.guard';
import { CompanyUserGuard } from '@auth/company-user.guard';
import { SearchJobOfferDto } from '@job-offer/search-job-offer.dto';

describe('[GET] /job-offers (e2e)', () => {
  const company = createTestCompany();
  const AUTHENTICATED: TokenPayload = createAuthenticated({
    roles: [Role.COMPANY],
    company: { id: company.id, name: company.name }
  });
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    PrismaService,
    JobOfferService,
    JobOfferRepository,
  ];

  const IMPORTS = [];

  const CONTROLLERS = [JobOfferController];

  const GUARDS = [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CompanyUserGuard,
    },
  ];

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
          },
          ...GUARDS
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(JobOfferRepository)
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
        .get('/job-offers')
        .query({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation fail', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
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
          },
          ...GUARDS
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(JobOfferRepository)
        .useValue({})
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when page and perPage are not sent', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);

      expect(result.body).toHaveProperty("page");
      expect(result.body).toHaveProperty("perPage");
    });

    it('Should return 422 when page and perPage are not number', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query({ page: faker.string.alpha(), perPage: faker.string.alpha() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);

      expect(result.body).toHaveProperty("page");
      expect(result.body).toHaveProperty("perPage");
    });

    it('Should return 422 when locationType is not a valid LocationType', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query({ locationType: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);

      expect(result.body).toHaveProperty("locationType");
    });
    it('Should return 422 when type not a valid JobType', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query({ locationType: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);

      expect(result.body).toHaveProperty("locationType");
    });
    it('Should return 422 when companyCategory not a valid CompanyCategory', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query({ companyCategory: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);

      expect(result.body).toHaveProperty("companyCategory");
    });
  });

  describe('Validation pass', () => {
    const { total_count, ...jobOfferDto } = createTestRawJobOfferDto();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }

    const mockedJobOfferRepository = {
      findJobOffersByUserId: jest.fn(
        (userId: string, searchJobOfferDto: SearchJobOfferDto) => Promise.resolve({
          total: total_count,
          data: [jobOfferDto]
        })
      )
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findJobOffersByUserId.mockClear();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: [
          ...PROVIDERS,
          {
            provide: APP_GUARD,
            useValue: mockedAuthGuard,
          },
          ...GUARDS
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(JobOfferRepository)
        .useValue(mockedJobOfferRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 201', async () => {
      const searchJobOfferDto = createTestSearchJobOfferDto();
      const result = await request(app.getHttpServer())
        .get('/job-offers')
        .query(searchJobOfferDto);        

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findJobOffersByUserId).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findJobOffersByUserId.mock.calls[0][0]).toBe(AUTHENTICATED.sub);
      expect(mockedJobOfferRepository.findJobOffersByUserId.mock.calls[0][1]).toMatchObject(
        searchJobOfferDto
      );
      expect(result.body['total']).toBe(total_count);
      expect(result.body['data'].length).toBe(1);
      expect(result.body['data'][0]).toMatchObject({
        ...jobOfferDto,
        expired_at: jobOfferDto.expired_at.toISOString(),
        posted_at: jobOfferDto.posted_at.toISOString()
      });
    });
  });
});
