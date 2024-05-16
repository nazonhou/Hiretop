import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestAcceptJobApplicationDto, createTestApplicationFeedback, createTestCompany, createTestJobApplication, createTestJobApplicationWithDetails, createTestJobInterview, createTestJobOffer, createTestJobOfferDto, createTestRejectJobApplicationDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { JobApplicationStatus, JobInterview, Role } from '@prisma/client';
import { JobApplicationService } from '@job-application/job-application.service';
import { JobApplicationRepository } from '@job-application/job-application.repository';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobApplicationController } from '@job-application/job-application.controller';
import { RejectJobApplicationDto } from '@job-application/reject-job-application.dto';
import { JobInterviewTimeConstraint } from '@validation/job-interview-time-constraint';
import { JobInterviewRepository } from '@job-interview/job-interview.repository';
import { RequestInterceptorModule } from '@request-interceptor/request-interceptor.module';
import { AcceptJobApplicationDto } from '@job-application/accept-job-application.dto';

describe('[PUT] /job-applications/:jobApplicationId/accepted (e2e)', () => {
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
    JobInterviewTimeConstraint,
    JobApplicationService,
    JobApplicationRepository,
    JobInterviewRepository,
    PrismaService
  ];

  const IMPORTS = [RequestInterceptorModule];

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
        .overrideProvider(JobInterviewRepository)
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
      const jobApplicationId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User does not have COMPANY role', () => {
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
        .overrideProvider(JobApplicationRepository)
        .useValue({})
        .overrideProvider(JobInterviewRepository)
        .useValue({})
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      const { company, ...authenticated } = AUTHENTICATED;
      app.use(authenticationMiddleware({ ...authenticated, roles: [Role.ADMIN] }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobApplicationId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User is not linked to a company', () => {
    const jobApplication = createTestJobApplicationWithDetails();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(jobApplication))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();

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
        .overrideProvider(JobInterviewRepository)
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
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(0);
    });
  });

  describe('jobApplicationId does not reference a jobApplication', () => {
    const jobApplication = createTestJobApplicationWithDetails();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(null))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();

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
        .overrideProvider(JobInterviewRepository)
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

    it('Should return 403', async () => {
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('jobApplicationId is not a valid uuid', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => new Promise((resolve, reject) => {
        throw new PrismaClientKnownRequestError(
          faker.lorem.sentence(), { code: faker.string.numeric(), clientVersion: faker.string.numeric() }
        );
      }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();

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
        .overrideProvider(JobInterviewRepository)
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

    it('Should return 403', async () => {
      const jobApplicationId = faker.lorem.word();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('jobApplication status is not equal to TO_ASSESS', () => {
    const jobApplication = {
      ...createTestJobApplicationWithDetails(),
      status: faker.helpers.arrayElement([JobApplicationStatus.ACCEPTED, JobApplicationStatus.REJECTED])
    };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(jobApplication))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();

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
        .overrideProvider(JobInterviewRepository)
        .useValue({})
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware({
        ...AUTHENTICATED,
        company: { id: jobApplication.jobOffer.companyId, name: AUTHENTICATED.company.name }
      }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('Validation fail', () => {
    const jobApplication = {
      ...createTestJobApplicationWithDetails(),
      status: JobApplicationStatus.TO_ASSESS
    };
    const jobInterview: JobInterview = createTestJobInterview();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(jobApplication))
    }
    const mockedJobInterviewRepository = {
      findJobInterviewsWhichOverlaps: jest.fn(
        (startedAt: Date, endedAt: Date, companyId: string) => Promise.resolve([jobInterview])
      )
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();
      mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mockClear();

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
        .overrideProvider(JobInterviewRepository)
        .useValue(mockedJobInterviewRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware({
        ...AUTHENTICATED,
        company: { id: jobApplication.jobOffer.companyId, name: AUTHENTICATED.company.name }
      }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when message, startedAt and endedAt are not sent', async () => {
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`)
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty('message');
      expect(result.body).toHaveProperty('startedAt');
      expect(result.body).toHaveProperty('endedAt');
    });

    it('Should return 422 when startedAt and endedAt are not valid dates', async () => {
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`)
        .send({ startedAt: faker.lorem.text(), endedAt: faker.lorem.text() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps).toHaveBeenCalledTimes(0);
      expect(result.body).toHaveProperty('startedAt');
      expect(result.body).toHaveProperty('endedAt');
    });

    it('Should return 422 when endedAt is older than startedAt', async () => {
      const jobApplicationId = jobApplication.id;
      const startedAt = faker.date.soon();
      const endedAt = faker.date.recent();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`)
        .send({ startedAt, endedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps).toHaveBeenCalledTimes(1);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][0]).toMatchObject(startedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][1]).toMatchObject(endedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][2]).toBe(jobApplication.jobOffer.companyId);
      expect(result.body).toHaveProperty('endedAt');
    });

    it('Should return 422 when jobInterview duration overlaps existing jobInterview', async () => {
      const jobApplicationId = jobApplication.id;
      const startedAt = faker.date.recent();
      const endedAt = faker.date.soon();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`)
        .send({ startedAt, endedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps).toHaveBeenCalledTimes(1);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][0]).toMatchObject(startedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][1]).toMatchObject(endedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][2]).toBe(jobApplication.jobOffer.companyId);
      expect(result.body).toHaveProperty('startedAt');
    });
  });

  describe('Validation pass', () => {
    const jobApplication = {
      ...createTestJobApplicationWithDetails(),
      status: JobApplicationStatus.TO_ASSESS
    };
    const acceptJobApplicationDto = createTestAcceptJobApplicationDto();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const jobApplicationWithApplicationFeedback = {
      id: jobApplication.id,
      applicantId: jobApplication.applicantId,
      appliedAt: jobApplication.appliedAt,
      jobOfferId: jobApplication.jobOfferId,
      status: JobApplicationStatus.REJECTED,
      applicationFeedback: {
        ...createTestApplicationFeedback(),
        jobApplicationId: jobApplication.id,
        message: acceptJobApplicationDto.message
      },
      jobInterview: {
        ...createTestJobInterview(),
        jobApplicationId: jobApplication.id,
        startedAt: acceptJobApplicationDto.startedAt,
        endedAt: acceptJobApplicationDto.endedAt
      }
    };

    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(jobApplication)),
      acceptJobApplication: jest.fn(
        (jobApplicationId: string, acceptJobApplicationDto: AcceptJobApplicationDto) => Promise.resolve(jobApplicationWithApplicationFeedback)
      )
    }

    const mockedJobInterviewRepository = {
      findJobInterviewsWhichOverlaps: jest.fn(
        (startedAt: Date, endedAt: Date, companyId: string) => Promise.resolve([])
      )
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();
      mockedJobApplicationRepository.acceptJobApplication.mockClear();
      mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mockClear();

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
        .overrideProvider(JobInterviewRepository)
        .useValue(mockedJobInterviewRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware({
        ...AUTHENTICATED,
        company: { id: jobApplication.jobOffer.companyId, name: AUTHENTICATED.company.name }
      }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 200', async () => {
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/accepted`)
        .send(acceptJobApplicationDto);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps).toHaveBeenCalledTimes(1);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][0]).toMatchObject(acceptJobApplicationDto.startedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][1]).toMatchObject(acceptJobApplicationDto.endedAt);
      expect(mockedJobInterviewRepository.findJobInterviewsWhichOverlaps.mock.calls[0][2]).toBe(jobApplication.jobOffer.companyId);
      expect(result.body).toMatchObject({
        ...jobApplicationWithApplicationFeedback,
        appliedAt: jobApplicationWithApplicationFeedback.appliedAt.toISOString(),
        applicationFeedback: {
          ...jobApplicationWithApplicationFeedback.applicationFeedback,
          sentAt: jobApplicationWithApplicationFeedback.applicationFeedback.sentAt.toISOString()
        },
        jobInterview: {
          ...jobApplicationWithApplicationFeedback.jobInterview,
          endedAt: jobApplicationWithApplicationFeedback.jobInterview.endedAt.toISOString(),
          startedAt: jobApplicationWithApplicationFeedback.jobInterview.startedAt.toISOString()
        }
      });
    });
  });

});
