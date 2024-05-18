import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestGetJobOfferStatisticsDto } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { JobApplicationStatus, Role } from '@prisma/client';
import { JobOfferService } from '@job-offer/job-offer.service';
import { JobOfferRepository } from '@job-offer/job-offer.repository';
import { JobOfferController } from '@job-offer/job-offer.controller';
import { RolesGuard } from '@auth/roles.guard';
import { CompanyUserGuard } from '@auth/company-user.guard';
import { GetJobOfferStatisticsDto } from '@job-offer/get-job-offer-statistics.dto';

describe('[GET] /job-offers/statistics (e2e)', () => {
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
    JobOfferService,
    JobOfferRepository,
    PrismaService,
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
        .get('/job-offers/statistics');

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User have not COMPANY role', () => {
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
      app.use(authenticationMiddleware({ ...AUTHENTICATED, roles: [Role.ADMIN] }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User is not linked to a COMPANY', () => {
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
      const { company, ...authenticated } = AUTHENTICATED;
      app.use(authenticationMiddleware(authenticated));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
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

    it('Should return 422 when start and end are not sent', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("start");
      expect(result.body).toHaveProperty("end");
    });

    it('Should return 422 when start and end are not valid dates', async () => {
      const start = 'FAKE_DATE';
      const end = 'FAKE_DATE';
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')
        .query({ start, end });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("start");
      expect(result.body).toHaveProperty("end");
    });

    it('Should return 422 when end is older than start', async () => {
      const end = faker.date.recent();
      const start = faker.date.soon();
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')
        .query({ start, end });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("end");
    });

    it('Should return 422 when locationType is not a valid LocationType', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')
        .query({ locationType: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("locationType");
    });
    it('Should return 422 when type not a valid JobType', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')
        .query({ jobType: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("jobType");
    });
  });

  describe('Validation pass', () => {
    const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = createTestGetJobOfferStatisticsDto();
    const statistics = [
      { status: JobApplicationStatus.ACCEPTED, total: faker.number.int() },
      { status: JobApplicationStatus.REJECTED, total: faker.number.int() },
      { status: JobApplicationStatus.TO_ASSESS, total: faker.number.int() },
    ]
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      getJobOffersStatistics: jest.fn(
        (companyId: string, getJobOfferStatisticsDto: GetJobOfferStatisticsDto) => Promise.resolve(statistics)
      )
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.getJobOffersStatistics.mockClear();

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

    it('Should return 200', async () => {
      const result = await request(app.getHttpServer())
        .get('/job-offers/statistics')
        .query(getJobOfferStatisticsDto);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.getJobOffersStatistics).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.getJobOffersStatistics.mock.calls[0][0]).toBe(AUTHENTICATED.company?.id);
      expect(mockedJobOfferRepository.getJobOffersStatistics.mock.calls[0][1]).toMatchObject(getJobOfferStatisticsDto);
      expect(result.body).toMatchObject(statistics);
    });
  });
});
