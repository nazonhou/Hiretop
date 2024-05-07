import { TokenPayload } from "@auth/auth.service";
import hashConfig from "@config/hash.config";
import { faker } from "@faker-js/faker";
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@prisma-module/prisma.service";
import { RequestInterceptorModule } from "@request-interceptor/request-interceptor.module";
import { CreateSkillDto } from "@skill/create-skill.dto";
import { SkillRepository } from "@skill/skill.repository";
import { authenticationMiddleware, createAuthenticated, createTestSkill, createTestSkillDto, createTestUser, createUpdateProfileDto } from "@src/test-utils";
import { UpdateProfileDto } from "@user/update-profile-dto";
import { UserController } from "@user/user.controller";
import { UserRepository } from "@user/user.repository";
import { UserService } from "@user/user.service";
import { IsSkillNameAlreadyExistConstraint } from "@validation/skill-name-constraint";
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from "@validation/validation.service";
import * as request from 'supertest';

describe('[POST] /users/skills (e2e)', () => {
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
    IsSkillNameAlreadyExistConstraint,
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
        .post('/users/skills')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Name already used', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findOneByName: jest.fn((name: string) => Promise.resolve(createTestSkill()))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findOneByName.mockClear();

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

    it('Should return 422 when name is not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/users/skills')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("name");
    });
    it('Should return 422 when name is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/users/skills')
        .send(createTestSkillDto());

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("name");
    });
  });

  describe('Validation pass', () => {
    const skill = { ...createTestSkill(), authorId: AUTHENTICATED.sub };
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findOneByName: jest.fn((name: string) => Promise.resolve(null)),
      createSkill: jest.fn((authorId: string, data: CreateSkillDto) => Promise.resolve(skill))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findOneByName.mockClear();
      mockedSkillRepository.createSkill.mockClear();

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
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 201', async () => {
      const { id, authorId, ...createSkillDto } = skill;
      const result = await request(app.getHttpServer())
        .post('/users/skills')
        .send(createSkillDto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findOneByName).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.createSkill).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.createSkill.mock.calls[0][0]).toBe(authorId);
      expect(mockedSkillRepository.createSkill.mock.calls[0][1]).toMatchObject(createSkillDto);
      expect(result.body).toMatchObject(skill);
    });
  });

});