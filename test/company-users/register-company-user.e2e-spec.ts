import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { UserRepository } from '@user/user.repository';
import { User } from '@prisma/client';
import { PrismaService } from '@prisma-module/prisma.service';
import { faker } from '@faker-js/faker';
import { createCompanyUserDto, createTestCompany, createTestUser } from '@src/test-utils';
import { ConfigModule } from '@nestjs/config';
import hashConfig from '@config/hash.config';
import { UserService } from '@user/user.service';
import { CompanyUserController } from '@user/company-user.controller';
import { IsUserEmailAlreadyExistConstraint } from '@validation/user-email-constraint';
import { IsUserPhoneNumberAlreadyExistConstraint } from '@validation/user-phone-number-constraint';
import { IsCompanyNameAlreadyExistConstraint } from '@validation/company-name-constraint';
import { CompanyRepository } from '@company/company.repository';
import { APP_PIPE } from '@nestjs/core';
import { exceptionFactory } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import * as bcrypt from 'bcrypt';
import { CreateCompanyUserDto } from '@user/create-company-user-dto';

describe('[POST] /company-users (e2e)', () => {
  let app: INestApplication;
  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true, exceptionFactory }),
    },
    ValidationService,
    UserService,
    UserRepository,
    CompanyRepository,
    PrismaService,
    IsUserEmailAlreadyExistConstraint,
    IsUserPhoneNumberAlreadyExistConstraint,
    IsCompanyNameAlreadyExistConstraint
  ];

  const IMPORTS = [
    ConfigModule.forRoot({
      load: [hashConfig],
      isGlobal: true
    })
  ];

  const CONTROLLERS = [CompanyUserController];

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

    const findOneByNameMock = jest.fn(
      (name: string) => Promise.resolve({
        ...createTestCompany(),
        name
      })
    );
    const companyRepository = {
      findOneByName: findOneByNameMock
    };

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
        controllers: CONTROLLERS
      })
        .overrideProvider(UserRepository)
        .useValue(userRepository)
        .overrideProvider(CompanyRepository)
        .useValue(companyRepository)
        .overrideProvider(PrismaService)
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

    it('should return 422 when any of email password companyName or name is not sent', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({});

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
      expect(result.body).toHaveProperty("password");
      expect(result.body).toHaveProperty("name");
      expect(result.body).toHaveProperty("companyName");
    });

    it('should return 422 when email is not a valid email', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ email: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
    });

    it('should return 422 when email is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ email: faker.internet.email() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("email");
    });

    it('should return 422 when birthday is not a valid date', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ birthday: faker.internet.email() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("birthday");
    });

    it('should return 422 when phoneNumber is not a numeric string', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ phoneNumber: faker.string.alpha() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("phoneNumber");
    });

    it('should return 422 when phoneNumber is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ phoneNumber: faker.string.numeric({ length: { min: 8, max: 10 } }) });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("phoneNumber");
    });

    it('should return 422 when we detect non unique value in values array', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ values: ['double', 'double'] });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("values");
    });

    it('should return 422 when companyName is already used', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send({ companyName: faker.company.name() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result.body).toHaveProperty("companyName");
    });
  });

  describe("Body validation pass", () => {
    const dto = createCompanyUserDto();
    const { companyName, values, culture, history, presentation, ...user } = dto;
    user['id'] = faker.string.uuid();

    const findOneByEmailMock = jest.fn(
      (email: string): Promise<User | null> => Promise.resolve(null)
    );
    const createCompanyUserMock = jest.fn((createCompanyUserDto: CreateCompanyUserDto) => Promise.resolve(user));
    const findOneByPhoneNumberMock = jest.fn(
      (phoneNumber: string): Promise<User | null> => Promise.resolve(null)
    );
    const userRepository = {
      findOneByEmail: findOneByEmailMock,
      createCompanyUser: createCompanyUserMock,
      findOneByPhoneNumber: findOneByPhoneNumberMock
    };

    const findOneByNameMock = jest.fn(
      (name: string) => Promise.resolve(null)
    );
    const companyRepository = {
      findOneByName: findOneByNameMock
    };

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: IMPORTS,
        providers: PROVIDERS,
        controllers: CONTROLLERS
      })
        .overrideProvider(UserRepository)
        .useValue(userRepository)
        .overrideProvider(CompanyRepository)
        .useValue(companyRepository)
        .overrideProvider(PrismaService)
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
      findOneByNameMock.mockClear();
      findOneByPhoneNumberMock.mockClear();
      createCompanyUserMock.mockClear();
    })

    it('should return 201', async () => {
      const result = await request(app.getHttpServer())
        .post('/company-users')
        .send(dto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(user).toMatchObject({ ...result.body, birthday: new Date(result.body["birthday"]) });
      expect(createCompanyUserMock).toHaveBeenCalledTimes(1);
      const [createCompanyUserDto] = createCompanyUserMock.mock.calls[0];
      expect(await bcrypt.compare(user.password, createCompanyUserDto.password)).toBeTruthy();
    });
  });
});
