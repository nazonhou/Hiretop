import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestJobApplication, createTestJobApplicationWithDetails, createTestJobOffer, createTestJobOfferDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
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
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('[GET] /job-offers/:jobOfferId/job-applications/:jobApplicationId (e2e)', () => {
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
    PrismaService,
    JobOfferRepository
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
        .overrideProvider(JobApplicationRepository)
        .useValue({})
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
      const jobOfferId = faker.string.uuid();
      const jobApplicationId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

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
        .overrideProvider(JobOfferRepository)
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
      const jobOfferId = faker.string.uuid();
      const jobApplicationId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

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
        .overrideProvider(JobOfferRepository)
        .useValue({})
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      const { company, ...authenticated } = AUTHENTICATED;
      app.use(authenticationMiddleware({ ...authenticated }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobOfferId = jobApplication.jobOfferId;
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('User company is not the same as the jobOffer company', () => {
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

    it('Should return 403', async () => {
      const jobOfferId = jobApplication.jobOfferId;
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
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

    it('Should return 403', async () => {
      const jobOfferId = jobApplication.jobOfferId;
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('jobApplicationId is not a valid uuid', () => {
    const jobApplication = createTestJobApplicationWithDetails();
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

    it('Should return 403', async () => {
      const jobOfferId = jobApplication.jobOfferId;
      const jobApplicationId = faker.lorem.word();
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('jobApplicationId is not linked to jobOfferId', () => {
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

    it('Should return 403', async () => {
      const jobOfferId = faker.string.uuid();
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
    });
  });

  describe('jobApplicationId is linked to jobOfferId, reference a real jobApplication and user company is the same as jobOffer one', () => {
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
        .overrideProvider(JobOfferRepository)
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

    it('Should return 200', async () => {
      const jobOfferId = jobApplication.jobOfferId;
      const jobApplicationId = jobApplication.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications/${jobApplicationId}`);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findOneJobApplication.mock.calls[0][0]).toBe(jobApplicationId);
      expect(result.body['applicant']).toMatchObject({
        ...jobApplication.applicant,
        birthday: jobApplication.applicant.birthday.toISOString(),
        workExperiences: [
          {
            ...jobApplication.applicant.workExperiences[0],
            endedAt: jobApplication.applicant.workExperiences[0].endedAt.toISOString(),
            startedAt: jobApplication.applicant.workExperiences[0].startedAt.toISOString(),
          }
        ]
      });
      expect(result.body['appliedAt']).toBe(jobApplication.appliedAt.toISOString());
      expect(result.body['jobOffer']).toMatchObject({
        ...jobApplication.jobOffer,
        expiredAt: jobApplication.jobOffer.expiredAt.toISOString(),
        postedAt: jobApplication.jobOffer.postedAt.toISOString(),
      });
    });
  });

});
