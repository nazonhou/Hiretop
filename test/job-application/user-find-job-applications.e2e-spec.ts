import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestJobApplicationWithAllDetails } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { JobApplicationService } from '@job-application/job-application.service';
import { JobApplicationRepository } from '@job-application/job-application.repository';
import { JobApplicationController } from '@job-application/job-application.controller';
import { PaginationDto } from '@src/pagination.dto';

describe('[GET] /job-applications (e2e)', () => {
  const AUTHENTICATED: TokenPayload = createAuthenticated({
    roles: [],
  });
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    JobApplicationService,
    JobApplicationRepository,
    PrismaService
  ];

  const IMPORTS = [];

  const CONTROLLERS = [JobApplicationController];

  const GUARDS = [];

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
        .overrideProvider(JobApplicationRepository)
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
        .get(`/job-applications`);

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation fail', () => {
    const jobApplication = createTestJobApplicationWithAllDetails();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findApplicationsByApplicantId: jest.fn((
        applicantId: string,
        paginationDto: PaginationDto
      ) => Promise.resolve([[jobApplication], 1]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findApplicationsByApplicantId.mockClear();

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
        .overrideProvider(JobApplicationRepository)
        .useValue(mockedJobApplicationRepository)
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
        .get(`/job-applications`)
        .query({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findApplicationsByApplicantId).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty('page');
      expect(result.body).toHaveProperty('perPage');
    });

    it('Should return 422 when page and perPage are not valid numbers', async () => {
      const result = await request(app.getHttpServer())
        .get(`/job-applications`)
        .query({ page: faker.lorem.text(), perPage: faker.lorem.text() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findApplicationsByApplicantId).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty('page');
      expect(result.body).toHaveProperty('perPage');
    });
  });

  describe('Validation pass', () => {
    const jobApplication = createTestJobApplicationWithAllDetails();
    const paginationDto: PaginationDto = { page: faker.number.int(), perPage: faker.number.int() };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findApplicationsByApplicantId: jest.fn((
        applicantId: string,
        paginationDto: PaginationDto
      ) => Promise.resolve([[jobApplication], 1]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findApplicationsByApplicantId.mockClear();

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
        .overrideProvider(JobApplicationRepository)
        .useValue(mockedJobApplicationRepository)
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
        .get(`/job-applications`)
        .query(paginationDto);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findApplicationsByApplicantId).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findApplicationsByApplicantId.mock.calls[0][0]).toBe(AUTHENTICATED.sub);
      expect(mockedJobApplicationRepository.findApplicationsByApplicantId.mock.calls[0][1]).toMatchObject(paginationDto);
      expect(result.body.data.length).toBe(1);
      expect(result.body.data[0].id).toBe(jobApplication.id);
      expect(result.body.total).toBe(1);
    });
  });

});
