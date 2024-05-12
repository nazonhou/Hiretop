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
import { JobApplicationStatus, Role } from '@prisma/client';
import { JobOfferRepository } from '@job-offer/job-offer.repository';
import { JobOfferApplicationController } from '@job-application/job-offer-application.controller';
import { JobApplicationService } from '@job-application/job-application.service';
import { JobApplicationRepository } from '@job-application/job-application.repository';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PaginationDto } from '@src/pagination.dto';
import { JobApplicationDto } from '@job-application/job-application.dto';
import { createTestUser } from "@src/test-utils";

describe('[GET] /job-offers/:jobOfferId/job-applications (e2e)', () => {
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
        .get(`/job-offers/${jobOfferId}/job-applications`)
        .send({});

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
        .overrideProvider(JobOfferRepository)
        .useValue({})
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
      const jobOfferId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`)
        .send({});

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User is not linked to a company', () => {
    const jobOffer = createTestJobOffer();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => Promise.resolve(jobOffer))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();

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
      const { company, ...authenticated } = AUTHENTICATED;
      app.use(authenticationMiddleware({ ...authenticated }));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobOfferId = jobOffer.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(0);
    });
  });

  describe('User company is not the same as the jobOffer company', () => {
    const jobOffer = createTestJobOffer();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => Promise.resolve(jobOffer))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();

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
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobOfferId = jobOffer.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOffer.id);
    });
  });

  describe('jobOfferId does not reference a jobOffer', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => Promise.resolve(null))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();

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
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobOfferId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOfferId);
    });
  });

  describe('jobOfferId is not a valid uuid', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => new Promise((resolve, reject) => {
        throw new PrismaClientKnownRequestError(
          faker.lorem.sentence(), { code: faker.string.numeric(), clientVersion: faker.string.numeric() }
        );
      }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();

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
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 403', async () => {
      const jobOfferId = 'FAKE_ID';
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`);

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOfferId);
    });
  });

  describe('Validation fail', () => {
    const jobOffer = { ...createTestJobOffer(), companyId: AUTHENTICATED.company?.id };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => Promise.resolve(jobOffer))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();

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
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when perPage and page are not sent', async () => {
      const jobOfferId = jobOffer.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`);

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOfferId);
      expect(result.body).toHaveProperty('perPage');
      expect(result.body).toHaveProperty('page');
    });

    it('Should return 422 when perPage and page are not valid numbers', async () => {
      const jobOfferId = jobOffer.id;
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`)
        .query({ perPage: faker.lorem.word(), page: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOfferId);
      expect(result.body).toHaveProperty('perPage');
      expect(result.body).toHaveProperty('page');
    });
  });

  describe('Validation pass', () => {
    const jobOffer = { ...createTestJobOffer(), companyId: AUTHENTICATED.company?.id };
    const { phoneNumber, ...applicant } = createTestUser();
    const jobApplicationDto: JobApplicationDto = {
      ...applicant,
      phone_number: phoneNumber,
      matchedSkills: 3,
      appliedAt: faker.date.recent(),
      jobApplicationStatus: faker.helpers.enumValue(JobApplicationStatus),
      jobOfferId: jobOffer.id,
      totalSkills: 5,
      matchingRate: 3 / 5,
      jobApplicationId: faker.string.uuid()
    };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedJobOfferRepository = {
      findOneById: jest.fn((jobOfferId: string) => Promise.resolve(jobOffer))
    }
    const mockedJobApplicationRepository = {
      findApplicationsByJobOfferId: jest.fn((
        jobOfferId: string,
        paginationDto: PaginationDto
      ): Promise<{
        total: number;
        data: Partial<JobApplicationDto>[];
      }> => Promise.resolve({ total: 1, data: [jobApplicationDto] }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedJobOfferRepository.findOneById.mockClear();
      mockedJobApplicationRepository.findApplicationsByJobOfferId.mockClear();

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

    it('Should return 200', async () => {
      const jobOfferId = jobOffer.id;
      const paginationDto: PaginationDto = { page: 1, perPage: 10 };
      const result = await request(app.getHttpServer())
        .get(`/job-offers/${jobOfferId}/job-applications`)
        .query(paginationDto) ;

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.findOneById.mock.calls[0][0]).toBe(jobOfferId);
      expect(mockedJobApplicationRepository.findApplicationsByJobOfferId).toHaveBeenCalledTimes(1);
      expect(mockedJobApplicationRepository.findApplicationsByJobOfferId.mock.calls[0][0])
        .toBe(jobOffer.id);
      expect(mockedJobApplicationRepository.findApplicationsByJobOfferId.mock.calls[0][1])
        .toMatchObject(paginationDto);
      expect(result.body['total']).toBe(1);
      expect(result.body['data'].length).toBe(1);
      expect(result.body['data'][0]).toMatchObject({
        ...jobApplicationDto,
        appliedAt: jobApplicationDto.appliedAt.toISOString(),
        birthday: jobApplicationDto.birthday.toISOString(),
      });
    });

  });

});
