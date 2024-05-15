import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestApplicationFeedback, createTestCompany, createTestJobApplication, createTestJobApplicationWithDetails, createTestJobOffer, createTestJobOfferDto, createTestRejectJobApplicationDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { JobApplicationStatus, Role } from '@prisma/client';
import { JobApplicationService } from '@job-application/job-application.service';
import { JobApplicationRepository } from '@job-application/job-application.repository';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobApplicationController } from '@job-application/job-application.controller';
import { RejectJobApplicationDto } from '@job-application/reject-job-application.dto';

describe('[PUT] /job-applications/:jobApplicationId (e2e)', () => {
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
      const jobApplicationId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`);

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
        .put(`/job-applications/${jobApplicationId}/rejected`)
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(result.body).toHaveProperty('message');
    });
  });

  describe('Validation pass', () => {
    const jobApplication = {
      ...createTestJobApplicationWithDetails(),
      status: JobApplicationStatus.TO_ASSESS
    };
    const rejectJobApplicationDto = createTestRejectJobApplicationDto();
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
        message: rejectJobApplicationDto.message
      }
    };

    const mockedJobApplicationRepository = {
      findOneJobApplication: jest.fn((jobApplicationId: string) => Promise.resolve(jobApplication)),
      rejectJobApplication: jest.fn(
        (jobApplicationId: string, rejectJobApplicationDto: RejectJobApplicationDto) => Promise.resolve(jobApplicationWithApplicationFeedback)
      )
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobApplicationRepository.findOneJobApplication.mockClear();
      mockedJobApplicationRepository.rejectJobApplication.mockClear();

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
        .put(`/job-applications/${jobApplicationId}/rejected`)
        .send(rejectJobApplicationDto);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(result.body).toMatchObject({
        ...jobApplicationWithApplicationFeedback,
        appliedAt: jobApplicationWithApplicationFeedback.appliedAt.toISOString(),
        applicationFeedback: {
          ...jobApplicationWithApplicationFeedback.applicationFeedback,
          sentAt: jobApplicationWithApplicationFeedback.applicationFeedback.sentAt.toISOString()
        }
      });
    });
  });

});
