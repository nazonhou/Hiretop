import { TokenPayload } from "@auth/auth.service";
import hashConfig from "@config/hash.config";
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_PIPE } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@prisma-module/prisma.service";
import { RequestInterceptorModule } from "@request-interceptor/request-interceptor.module";
import { SkillRepository } from "@skill/skill.repository";
import { authenticationMiddleware, createAuthenticated, createTestUser, createUpdateProfileDto } from "@src/test-utils";
import { UpdateProfileDto } from "@user/update-profile-dto";
import { UserController } from "@user/user.controller";
import { UserRepository } from "@user/user.repository";
import { UserService } from "@user/user.service";
import { IsUserPhoneNumberAlreadyExistConstraint } from "@validation/user-phone-number-constraint";
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from "@validation/validation.service";
import * as request from 'supertest';

describe('[PUT] /users/profile (e2e)', () => {
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
    PrismaService,
    IsUserPhoneNumberAlreadyExistConstraint,
    SkillRepository
  ];

  const IMPORTS = [
    RequestInterceptorModule,
    ConfigModule.forRoot({
      load: [hashConfig],
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
        .overrideProvider(SkillRepository)
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
        .put('/users/profile')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('User authenticated and phoneNumber is not used', () => {
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const userRepository = {
      findOneByPhoneNumber: jest.fn((phoneNumber: string) => Promise.resolve(null))
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      userRepository.findOneByPhoneNumber.mockClear();

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
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(SkillRepository)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when name not sent', async () => {
      const result = await request(app.getHttpServer())
        .put('/users/profile')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("name");
    });
  });

  describe('User authenticated and phoneNumber is already used', () => {
    const user = createTestUser();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const userRepository = {
      findOneByPhoneNumber: jest.fn((phoneNumber: string) => Promise.resolve(user))
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      userRepository.findOneByPhoneNumber.mockClear();

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
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(SkillRepository)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      app.use(authenticationMiddleware(AUTHENTICATED));
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('Should return 422 when phoneNumber is already used by someone else', async () => {
      const result = await request(app.getHttpServer())
        .put('/users/profile')
        .send({ phoneNumber: user.phoneNumber });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber.mock.calls[0][0]).toBe(user.phoneNumber);
    });
  });

  describe('User authenticated and validation pass and same phoneNumber sent', () => {
    const user = { ...createTestUser(), id: AUTHENTICATED.sub, email: AUTHENTICATED.email };
    const data = { ...createUpdateProfileDto(), phoneNumber: user.phoneNumber };

    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const userRepository = {
      findOneByPhoneNumber: jest.fn((phoneNumber: string) => Promise.resolve(user)),
      updateUser: jest.fn(
        (id: string, data: UpdateProfileDto) => Promise.resolve({ ...user, ...data })
      )
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      userRepository.findOneByPhoneNumber.mockClear();
      userRepository.updateUser.mockClear();

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
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(SkillRepository)
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
        .put('/users/profile')
        .send(data);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber.mock.calls[0][0]).toBe(data.phoneNumber);
      expect(result.body).toMatchObject({ ...data, birthday: new Date(data.birthday).toISOString() });
    });
  });

  describe('User authenticated and validation pass and new phoneNumber sent', () => {
    const user = { ...createTestUser(), id: AUTHENTICATED.sub, email: AUTHENTICATED.email };
    const data = { ...createUpdateProfileDto(), phoneNumber: user.phoneNumber };

    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const userRepository = {
      findOneByPhoneNumber: jest.fn((phoneNumber: string) => Promise.resolve(null)),
      updateUser: jest.fn(
        (id: string, data: UpdateProfileDto) => Promise.resolve({ ...user, ...data })
      )
    };
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      userRepository.findOneByPhoneNumber.mockClear();
      userRepository.updateUser.mockClear();

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
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(SkillRepository)
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
        .put('/users/profile')
        .send(data);

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber).toHaveBeenCalledTimes(1);
      expect(userRepository.findOneByPhoneNumber.mock.calls[0][0]).toBe(data.phoneNumber);
      expect(result.body).toMatchObject({ ...data, birthday: new Date(data.birthday).toISOString() });
    });
  });
})