import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { UserModule } from '@user/user.module';
import { UserRepository } from '@user/user.repository';
import { User } from '@prisma/client';
import { PrismaService } from '@prismaModule/prisma.service';
import { ValidationModule } from '@validation/validation.module';
import { faker } from '@faker-js/faker';
import { createTestUser } from '@src/test-utils';
import { CreateTalentDto } from '@user/create-talent.dto';
import { ConfigModule } from '@nestjs/config';
import hashConfig from '@config/hash.config';

describe('[POST] /talents (e2e)', () => {
  let app: INestApplication;

  describe("Validate body", () => {
    const userRepository = {};
    userRepository["findOneByEmail"] = (email: string): Promise<User | null> => Promise.resolve({
      ...createTestUser(), email
    });

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [UserModule, ValidationModule, ConfigModule.forRoot({
          load: [hashConfig],
          isGlobal: true
        })],
      })
        .overrideProvider(UserRepository)
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

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
  });

  describe("Body is validated", () => {
    const user = createTestUser();

    const userRepository = {};
    userRepository["findOneByEmail"] = (email: string): Promise<User | null> => Promise.resolve(null);
    userRepository["create"] = (createTalentDto: CreateTalentDto) => Promise.resolve(user);

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [UserModule, ValidationModule, ConfigModule.forRoot({
          load: [hashConfig],
          isGlobal: true
        })],
      })
        .overrideProvider(UserRepository)
        .useValue(userRepository)
        .overrideProvider(PrismaService)
        .useValue({})
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should return 201', async () => {
      const { id, ...createUserDto } = user;
      const result = await request(app.getHttpServer())
        .post('/talents')
        .send(createUserDto);

      expect(result.status).toEqual(HttpStatus.CREATED);
      expect(user).toMatchObject({ ...result.body, birthday: new Date(result.body["birthday"]) });
    });
  });
});
