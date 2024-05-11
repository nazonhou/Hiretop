import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestJobApplication, createTestJobOffer, createTestJobOfferDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { Role } from '@prisma/client';
import { JobOfferRepository } from '@job-offer/job-offer.repository';
import { JobOfferApplicationController } from '@job-application/job-offer-application.controller';
import { JobApplicationService } from '@job-application/job-application.service';
import { JobApplicationRepository } from '@job-application/job-application.repository';
import { CreateJobApplicationDto } from '@job-application/create-job-application.dto';

describe('[POST] /job-offers/:jobOfferId/job-applications (e2e)', () => {
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
    JobApplicationService,
    JobApplicationRepository,
    JobOfferRepository,
    PrismaService
  ];

  const IMPORTS = [];

  const CONTROLLERS = [JobOfferApplicationController];

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
        .overrideProvider(JobOfferRepository)
        .useValue({})
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
      const jobOfferId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .post(`/job-offers/${jobOfferId}/job-applications`)
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('jobOfferId is not a reference to an unexpired jobOffer', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneUnexpired: jest.fn((jobOfferId: string) => Promise.resolve(null))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneUnexpired.mockClear();

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

    it('Should return 403', async () => {
      const jobOfferId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .post(`/job-offers/${jobOfferId}/job-applications`)
        .send({});

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneUnexpired).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneUnexpired.mock.calls[0][0]).toBe(jobOfferId);
    });
  });

  describe('jobOfferId is a reference to a real and unexpired jobOffer', () => {
    const jobOffer = createTestJobOffer();
    const jobApplication = { ...createTestJobApplication(), jobOfferId: jobOffer.id, applicantId: AUTHENTICATED.sub };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneUnexpired: jest.fn((jobOfferId: string) => Promise.resolve(jobOffer))
    }
    const mockedJobApplicationRepository = {
      createJobApplication: jest.fn((createJobApplicationDto: CreateJobApplicationDto) => Promise.resolve(jobApplication))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneUnexpired.mockClear();

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

    it('Should return 201', async () => {
      const result = await request(app.getHttpServer())
        .post(`/job-offers/${jobOffer.id}/job-applications`)
        .send({});

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneUnexpired).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneUnexpired.mock.calls[0][0]).toBe(jobOffer.id);
      expect(mockedJobApplicationRepository.createJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.createJobApplication.mock.calls[0][0])
        .toMatchObject({ jobOfferId: jobOffer.id, applicantId: AUTHENTICATED.sub });
      expect(result.body).toMatchObject({ ...jobApplication, appliedAt: jobApplication.appliedAt.toISOString() })
    });
  });

});
