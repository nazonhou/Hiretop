import { AuthController } from "@auth/auth.controller";
import { AuthService } from "@auth/auth.service";
import hashConfig from "@config/hash.config";
import jwtConfig from "@config/jwt.config";
import { faker } from "@faker-js/faker";
import { HttpStatus, INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "@prisma-module/prisma.service";
import { SkillRepository } from "@skill/skill.repository";
import { createTestUser } from "@src/test-utils";
import { UserRepository } from "@user/user.repository";
import { UserService } from "@user/user.service";
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from "@validation/validation.service";
import * as request from 'supertest';

describe('[POST] /auth/login (e2e)', () => {
  let app: INestApplication;

  const originalEnv = process.env;

  const PROVIDERS = [
    AuthService,
    UserService,
    UserRepository,
    PrismaService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    SkillRepository
  ];
  const IMPORTS = [
    ConfigModule.forRoot({
      load: [jwtConfig, hashConfig],
      isGlobal: true
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: { expiresIn: configService.get<string>("jwt.expiresIn") },
        global: true
      }),
    })
  ];
  const CONTROLLERS = [AuthController];

  describe('Body validation fail', () => {
    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
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

    afterAll(async () => {
      await app.close();
    });

    it('should return 422 when any of email and password is not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/auth/login')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
      expect(result.body).toHaveProperty("password");
    });

    it('should return 422 when email is not a valid email', async () => {
      const result = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.string.alphanumeric() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
    });
  });

  describe('Email is not found in DB', () => {
    const findOneByEmailMock = jest.fn((email: string) => Promise.resolve(null));
    const userRepositoryMock = {
      findOneByEmail: findOneByEmailMock
    }
    beforeEach(async () => {
      findOneByEmailMock.mockClear();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
        controllers: CONTROLLERS
      })
        .overrideProvider(UserRepository)
        .useValue(userRepositoryMock)
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

    it('should return 401', async () => {
      const result = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: faker.internet.email(), password: faker.internet.password() });

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Email found in DB', () => {
    const saltRounds = 1;
    const jwtSecret = 'JWT_SECRET_TEST';
    const user = { ...createTestUser(), password: "$2a$04$s3ZDcxv/x6T4fSqmbztx7ufg/gvrdsvc1IaqAJJN9w8HjipdKIhnq" };
    const findOneByEmailMock = jest.fn((email: string) => Promise.resolve(user));
    const userRepositoryMock = {
      findOneByEmail: findOneByEmailMock
    }
    let jwtService: JwtService;
    beforeEach(async () => {
      findOneByEmailMock.mockClear();
      jest.resetModules();
      process.env = {
        ...originalEnv,
        HASH_SALT_ROUNDS: `${saltRounds}`,
        JWT_SECRET: `${jwtSecret}`
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
        controllers: CONTROLLERS
      })
        .overrideProvider(UserRepository)
        .useValue(userRepositoryMock)
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(SkillRepository)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      jwtService = moduleFixture.get<JwtService>(JwtService);
    });

    afterEach(async () => {
      process.env = originalEnv;
      await app.close();
    });

    it('should return 401 when password does not match', async () => {
      const result = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: "FAKE_PASSWORD" });

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(findOneByEmailMock).toHaveBeenCalledTimes(1);
    });

    it('should return 200 when password match', async () => {
      const result = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'password' });

      expect(result.status).toEqual(HttpStatus.OK);
      expect(findOneByEmailMock).toHaveBeenCalledTimes(1);
      expect(jwtService.verifyAsync(result.body['access_token'], { secret: jwtSecret }))
        .resolves
        .toMatchObject({ sub: user.id, email: user.email })
    });
  });
})