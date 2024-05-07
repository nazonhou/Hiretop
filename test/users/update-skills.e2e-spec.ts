import { TokenPayload } from "@auth/auth.service";
import { faker } from "@faker-js/faker";
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@prisma-module/prisma.service";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { RequestInterceptorModule } from "@request-interceptor/request-interceptor.module";
import { CreateSkillDto } from "@skill/create-skill.dto";
import { SkillRepository } from "@skill/skill.repository";
import { authenticationMiddleware, createAuthenticated, createTestSkill, createTestSkillDto, createTestUpdateSkillsDto } from "@src/test-utils";
import { UserController } from "@user/user.controller";
import { UserRepository } from "@user/user.repository";
import { UserService } from "@user/user.service";
import { IsSkillNameAlreadyExistConstraint } from "@validation/skill-name-constraint";
import { ArraySkillConstraint } from "@validation/user-skills-constraint";
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from "@validation/validation.service";
import * as request from 'supertest';

describe('[PUT] /users/skills (e2e)', () => {
  let app: INestApplication;
  const AUTHENTICATED: TokenPayload = createAuthenticated();
  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    UserService,
    UserRepository,
    SkillRepository,
    PrismaService,
    ArraySkillConstraint,
  ];

  const IMPORTS = [
    RequestInterceptorModule,
    ConfigModule.forRoot({
      load: [],
      isGlobal: true
    })
  ];

  const CONTROLLERS = [UserController];

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
        .overrideProvider(UserRepository)
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
        .put('/users/skills')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ids array contain some bad values', () => {
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
          }
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
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
      const result = await request(app.getHttpServer())
        .put('/users/skills')
        .send(createTestUpdateSkillsDto());

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("skillIds");
    });
  });

  describe('Ids array contain some values which are not uuid', () => {
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
          }
        ],
        controllers: CONTROLLERS
      })
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
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
      const result = await request(app.getHttpServer())
        .put('/users/skills')
        .send(createTestUpdateSkillsDto());

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("skillIds");
    });
  });

  describe('Validation pass', () => {
    const skill = { ...createTestSkill(), authorId: AUTHENTICATED.sub };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findByIds: jest.fn((ids: string[]) => Promise.resolve([skill.id]))
    }
    const mockedUserRepository = {
      updateSkills: jest.fn((userId: string, skillIds: string[]) => Promise.resolve([skill]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findByIds.mockClear();
      mockedUserRepository.updateSkills.mockClear();

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
        .overrideProvider(SkillRepository)
        .useValue(mockedSkillRepository)
        .overrideProvider(UserRepository)
        .useValue(mockedUserRepository)
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
        .put('/users/skills')
        .send({ ...createTestUpdateSkillsDto(), skillIds: [skill.id] });

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByIds).toHaveBeenCalledTimes(1);
      expect(mockedUserRepository.updateSkills).toHaveBeenCalledTimes(1);
      expect(result.body[0]).toMatchObject(skill);
    });
  });

});