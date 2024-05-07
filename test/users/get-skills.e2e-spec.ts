import { TokenPayload } from "@auth/auth.service";
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@prisma-module/prisma.service";
import { RequestInterceptorModule } from "@request-interceptor/request-interceptor.module";
import { SkillRepository } from "@skill/skill.repository";
import { authenticationMiddleware, createAuthenticated, createTestSkill, createTestSkillDto } from "@src/test-utils";
import { UserController } from "@user/user.controller";
import { UserRepository } from "@user/user.repository";
import { UserService } from "@user/user.service";
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from "@validation/validation.service";
import * as request from 'supertest';

describe('[GET] /users/skills (e2e)', () => {
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
        .get('/users/skills');

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User authenticated', () => {
    const skill = { ...createTestSkill(), authorId: AUTHENTICATED.sub }
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findUserSkills: jest.fn((userId: string) => Promise.resolve([skill]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findUserSkills.mockClear();

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

    it('Should return 200', async () => {
      const result = await request(app.getHttpServer())
        .get('/users/skills');

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findUserSkills).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findUserSkills.mock.calls[0][0]).toBe(AUTHENTICATED.sub);
      expect(result.body).toHaveLength(1);
      expect(result.body[0]).toMatchObject(skill);
    });
  });
});