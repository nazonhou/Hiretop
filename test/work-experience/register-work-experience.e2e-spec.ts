import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { authenticationMiddleware, createAuthenticated, createTestCompany, createTestWorkExperience } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { WorkExperienceService } from '@work-experience/work-experience.service';
import { IsCompanyIdConstraint } from '@validation/company-id-constraint';
import { WorkExperienceRepository } from '@work-experience/work-experience.repository';
import { WorkExperienceController } from '@work-experience/work-experience.controller';
import { TokenPayload } from '@auth/auth.service';
import { CompanyRepository } from '@company/company.repository';
import { faker } from '@faker-js/faker';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateWorkExperienceDto } from '@work-experience/create-work-experience.dto';
import { WorkExperience } from '@prisma/client';

describe('[POST] /work-experiences (e2e)', () => {
  const AUTHENTICATED: TokenPayload = createAuthenticated();
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    PrismaService,
    WorkExperienceService,
    IsCompanyIdConstraint,
    WorkExperienceRepository,
    CompanyRepository
  ];

  const IMPORTS = [];

  const CONTROLLERS = [WorkExperienceController];

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
        .overrideProvider(WorkExperienceRepository)
        .useValue({})
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
        .post('/work-experiences')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('companyId does not reference a real company record', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findOneById: jest.fn((id: string) => Promise.resolve(null))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findOneById.mockClear();

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
        .overrideProvider(WorkExperienceRepository)
        .useValue({})
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

    it('Should return 422 when title and companyId are not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("title");
      expect(result.body).toHaveProperty("companyId");
    });
    it('Should return 422 when companyId does not reference a real company record', async () => {
      const companyId = faker.string.uuid();
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ companyId });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById.mock.calls[0][0]).toBe(companyId);
      expect(result.body).toHaveProperty("companyId");
    });
    it('Should return 422 when startedAt is not a valid date', async () => {
      const startedAt = 'FAKE_DATE';
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ startedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("startedAt");
    });
    it('Should return 422 when startedAt is younger than today', async () => {
      const startedAt = faker.date.soon();
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ startedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("startedAt");
    });
    it('Should return 422 when endedAt is not a valid date', async () => {
      const startedAt = faker.date.recent();
      const endedAt = 'FAKE_DATE';
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ startedAt, endedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("endedAt");
    });
    it('Should return 422 when endedAt is older than startedAt', async () => {
      const startedAt = faker.date.recent();
      const endedAt = faker.date.recent({ refDate: startedAt });
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ startedAt, endedAt });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("endedAt");
    });
    it('Should return 422 when type is not a jobType', async () => {
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ type: faker.string.alphanumeric() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("type");
    });
    it('Should return 422 when locationType is not a LocationType', async () => {
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ locationType: faker.string.alphanumeric() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("locationType");
    });
  });

  describe('companyId is not a UUID', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedCompanyRepository = {
      findOneById: jest.fn((id: string) => new Promise((resolve, reject) => {
        throw new PrismaClientKnownRequestError(
          faker.lorem.sentence(), { code: faker.string.numeric(), clientVersion: faker.string.numeric() }
        );
      }))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findOneById.mockClear();

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
        .overrideProvider(WorkExperienceRepository)
        .useValue({})
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

    it('Should return 422', async () => {
      const companyId = faker.string.alphanumeric();
      const result = await request(app.getHttpServer())
        .post('/work-experiences')
        .send({ companyId });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById.mock.calls[0][0]).toBe(companyId);
      expect(result.body).toHaveProperty("companyId");
    });
  });

  describe('Validation pass', () => {
    const company = createTestCompany();
    const workExperience: WorkExperience = { ...createTestWorkExperience(), companyId: company.id };
    const { id, userId, ...createWorkExperienceDto } = workExperience;
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    };
    const mockedCompanyRepository = {
      findOneById: jest.fn((id: string) => Promise.resolve(company))
    };
    const mockedWorkExperienceRepository = {
      createWorkExperience: jest.fn(
        (userId: string, createWorkExperienceDto: CreateWorkExperienceDto) => Promise.resolve(workExperience)
      )
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedCompanyRepository.findOneById.mockClear();
      mockedWorkExperienceRepository.createWorkExperience.mockClear();

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
        .overrideProvider(WorkExperienceRepository)
        .useValue(mockedWorkExperienceRepository)
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
        .post('/work-experiences')
        .send(createWorkExperienceDto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById).toHaveBeenCalledTimes(1);
      expect(mockedCompanyRepository.findOneById.mock.calls[0][0]).toBe(createWorkExperienceDto.companyId);
      expect(mockedWorkExperienceRepository.createWorkExperience).toHaveBeenCalledTimes(1);
      expect(mockedWorkExperienceRepository.createWorkExperience.mock.calls[0][0]).toBe(AUTHENTICATED.sub);
      expect(mockedWorkExperienceRepository.createWorkExperience.mock.calls[0][1]).toMatchObject(createWorkExperienceDto);
      expect(result.body).toMatchObject({
        ...workExperience,
        startedAt: workExperience.startedAt.toISOString(),
        endedAt: workExperience.endedAt.toISOString(),
      });
    });
  });
});
