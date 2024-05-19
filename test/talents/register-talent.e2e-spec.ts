import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UserRepository } from '@user/user.repository';
import { User } from '@prisma/client';
import { PrismaService } from '@prisma-module/prisma.service';
import { faker } from '@faker-js/faker';
import { createTestUser } from '@src/test-utils';
import { CreateTalentDto } from '@user/create-talent.dto';
import { ConfigModule } from '@nestjs/config';
import hashConfig from '@config/hash.config';
import * as bcrypt from 'bcrypt';
import { APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { UserService } from '@user/user.service';
import { IsUserEmailAlreadyExistConstraint } from '@validation/user-email-constraint';
import { IsUserPhoneNumberAlreadyExistConstraint } from '@validation/user-phone-number-constraint';
import { TalentController } from '@user/talent.controller';
import { SkillRepository } from '@skill/skill.repository';

describe('[POST] /talents (e2e)', () => {
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    UserService,
    UserRepository,
    PrismaService,
    IsUserEmailAlreadyExistConstraint,
    IsUserPhoneNumberAlreadyExistConstraint,
    SkillRepository
  ];

  const IMPORTS = [
    ConfigModule.forRoot({
      load: [hashConfig],
      isGlobal: true
    })
  ];

  const CONTROLLERS = [TalentController];

  describe("Body validation fail", () => {
    const findOneByEmailMock = jest.fn(
      (email: string): Promise<User | null> => Promise.resolve({
        ...createTestUser(), email
      })
    );
    const findOneByPhoneNumberMock = jest.fn(
      (phoneNumber: string): Promise<User | null> => Promise.resolve({
        ...createTestUser(), phoneNumber
      })
    );
    const userRepository = {
      findOneByEmail: findOneByEmailMock,
      findOneByPhoneNumber: findOneByPhoneNumberMock
    };

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
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
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      findOneByEmailMock.mockClear();
      findOneByPhoneNumberMock.mockClear();
    })

    it('should return 422 when any of email password or name is not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
      expect(result.body).toHaveProperty("password");
      expect(result.body).toHaveProperty("name");
    });

    it('should return 422 when email is not a valid email', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({ email: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
    });

    it('should return 422 when email is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({ email: faker.internet.email() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
    });

    it('should return 422 when birthday is not a valid date', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({ birthday: faker.internet.email() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("birthday");
    });

    it('should return 422 when phoneNumber is not a numeric string', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({ phoneNumber: faker.string.alpha() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("phoneNumber");
    });

    it('should return 422 when phoneNumber is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send({ phoneNumber: faker.string.numeric({ length: { min: 8, max: 10 } }) });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("phoneNumber");
    });
  });

  describe("Body validation pass", () => {
    const user = createTestUser();

    const findOneByEmailMock = jest.fn(
      (email: string): Promise<User | null> => Promise.resolve(null)
    );
    const createMock = jest.fn((createTalentDto: CreateTalentDto) => Promise.resolve(user));
    const findOneByPhoneNumberMock = jest.fn(
      (phoneNumber: string): Promise<User | null> => Promise.resolve(null)
    );
    const userRepository = {
      findOneByEmail: findOneByEmailMock,
      create: createMock,
      findOneByPhoneNumber: findOneByPhoneNumberMock
    };

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
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
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    beforeEach(() => {
      findOneByEmailMock.mockClear();
      createMock.mockClear();
      findOneByPhoneNumberMock.mockClear();
    })

    it('should return 201', async () => {
      const { id, ...createUserDto } = user;
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send(createUserDto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(result.body.password).toBeUndefined();
      expect(user).toMatchObject({ ...result.body, birthday: new Date(result.body["birthday"]) });
      expect(createMock).toHaveBeenCalledTimes(1);
      const [createTalentDto] = createMock.mock.calls[0];
      expect(await bcrypt.compare(user.password, createTalentDto.password)).toBeTruthy();
    });
  });
});
