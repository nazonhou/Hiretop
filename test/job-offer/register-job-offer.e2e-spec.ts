import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestJobOffer, createTestJobOfferDto, createTestSkill, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { TokenPayload } from '@auth/auth.service';
import { faker } from '@faker-js/faker';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JobOffer, Role } from '@prisma/client';
import { JobOfferService } from '@job-offer/job-offer.service';
import { ArraySkillConstraint } from '@validation/array-skills-constraint';
import { JobOfferRepository } from '@job-offer/job-offer.repository';
import { SkillRepository } from '@skill/skill.repository';
import { JobOfferController } from '@job-offer/job-offer.controller';
import { RolesGuard } from '@auth/roles.guard';
import { CompanyUserGuard } from '@auth/company-user.guard';
import { CreateJobOfferDto } from '@job-offer/create-job-offer.dto';

describe('[POST] /job-offers (e2e)', () => {
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
    ArraySkillConstraint,
    JobOfferRepository,
    SkillRepository
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
        .overrideProvider(SkillRepository)
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
        .post('/job-offers')
        .send({});

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
        .overrideProvider(SkillRepository)
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
        .post('/job-offers')
        .send({});

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
        .overrideProvider(SkillRepository)
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
        .post('/job-offers')
        .send({});

      expect(result.status).toEqual(HttpStatus.FORBIDDEN);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('skillId does not reference a skill record', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findByIds: jest.fn((ids: string[]) => Promise.resolve([]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findByIds.mockClear();

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
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
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

    it('Should return 422 when skillIds and expiredAt are not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("skillIds");
      expect(result.body).toHaveProperty("expiredAt");
    });

    it('Should return 422 when skillId does not reference a real skill record', async () => {
      const skillId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ skillIds: [skillId] });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0].length).toBe(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0][0]).toBe(skillId);
      expect(result.body).toHaveProperty("skillIds");
    });

    it('Should return 422 when expiredAt is not a valid date', async () => {
      const expiredAt = 'FAKE_DATE';
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ expiredAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("expiredAt");
    });

    it('Should return 422 when expiredAt is older than today', async () => {
      const expiredAt = faker.date.recent();
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ expiredAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("expiredAt");
    });

    it('Should return 422 when locationType is not a valid LocationType', async () => {
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ locationType: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("locationType");
    });
    it('Should return 422 when type not a valid JobType', async () => {
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ type: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("type");
    });
  });

  describe('skillId is not a uuid value', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findByIds: jest.fn((ids: string[]) => new Promise((resolve, reject) => {
        throw new PrismaClientKnownRequestError(
          faker.lorem.sentence(), { code: faker.string.numeric(), clientVersion: faker.string.numeric() }
        );
      }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findByIds.mockClear();

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
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
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

    it('Should return 422', async () => {
      const skillId = faker.string.alpha();
      const result = await request(app.getHttpServer())
        .post('/job-offers')
        .send({ skillIds: [skillId] });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0].length).toBe(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0][0]).toBe(skillId);
      expect(result.body).toHaveProperty("skillIds");
    });
  });

  describe('Validation pass', () => {
    const skillId = faker.string.uuid();
    const jobOffer: JobOffer = {
      ...createTestJobOffer(),
      companyId: AUTHENTICATED.company?.id,
      authorId: AUTHENTICATED.sub
    };
    const createJobOfferDto: CreateJobOfferDto = {
      ...createTestJobOfferDto([skillId]),
      expiredAt: jobOffer.expiredAt,
      locationType: jobOffer.locationType,
      type: jobOffer.type
    };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findByIds: jest.fn((ids: string[]) => Promise.resolve([skillId]))
    }
    const mockedJobOfferRepository = {
      createJobOffer: jest.fn(
        (authorId: string,
          companyId: string,
          createJobOfferDto: CreateJobOfferDto
        ) => Promise.resolve(jobOffer)
      )
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findByIds.mockClear();
      mockedJobOfferRepository.createJobOffer.mockClear();

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
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
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
        .post('/job-offers')
        .send(createJobOfferDto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0].length).toBe(1);
      expect(mockedSkillRepository.findByIds.mock.calls[0][0][0]).toBe(skillId);
      expect(mockedJobOfferRepository.createJobOffer).toHaveBeenCalledTimes(1);
      expect(mockedJobOfferRepository.createJobOffer.mock.calls[0][0]).toBe(AUTHENTICATED.sub);
      expect(mockedJobOfferRepository.createJobOffer.mock.calls[0][1]).toBe(AUTHENTICATED.company?.id);
      expect(mockedJobOfferRepository.createJobOffer.mock.calls[0][2]).toMatchObject(createJobOfferDto);
      expect(result.body).toMatchObject({
        ...jobOffer,
        expiredAt: jobOffer.expiredAt.toISOString(),
        postedAt: jobOffer.postedAt.toISOString()
      });
    });
  });
});
