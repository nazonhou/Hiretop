import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '@prisma-module/prisma.service';
import { createTestSkill } from '@src/test-utils';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { getValidationPipeOptions } from "@validation/validation.module";
import { ValidationService } from '@validation/validation.service';
import { PaginationDto } from '@src/pagination.dto';
import { faker } from '@faker-js/faker';
import { SkillService } from '@skill/skill.service';
import { SkillRepository } from '@skill/skill.repository';
import { SkillController } from '@skill/skill.controller';
import { FilterSkillDto } from '@skill/filter-skill.dto';

describe('[GET] /skills/filters (e2e)', () => {
  let app: INestApplication;

  const PROVIDERS = [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    PrismaService,
    SkillService,
    SkillRepository
  ];

  const IMPORTS = [];

  const CONTROLLERS = [SkillController];

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
        .get('/skills/filters');

      expect(result.status).toEqual(HttpStatus.UNAUTHORIZED);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Validation fail', () => {
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
          }
        ],
        controllers: CONTROLLERS
      })
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

    it('Should return 422 when name, perPage and page are not sent', async () => {
      const result = await request(app.getHttpServer())
        .get('/skills/filters');

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("name");
      expect(result.body).toHaveProperty("perPage");
      expect(result.body).toHaveProperty("page");
    });
    it('Should return 422 when perPage and page are not numbers', async () => {
      const result = await request(app.getHttpServer())
        .get('/skills/filters')
        .query({ perPage: faker.lorem.word(), page: faker.lorem.word() });

      expect(result.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(result.body).toHaveProperty("perPage");
      expect(result.body).toHaveProperty("page");
    });
  });

  describe('Validation pass', () => {
    const skill = createTestSkill();
    const mockedAuthGuard = {
      canActivate: jest.fn((context: ExecutionContext) => Promise.resolve(true))
    }
    const mockedSkillRepository = {
      findByNameStartsWith: jest.fn((startsWith: string, paginationDto: PaginationDto) => Promise.resolve([skill]))
    }
    beforeEach(async () => {
      mockedAuthGuard.canActivate.mockClear();
      mockedSkillRepository.findByNameStartsWith.mockClear();

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

    it('Should return 200', async () => {
      const filterSkillDto: FilterSkillDto = {
        name: skill.name, perPage: faker.number.int(), page: faker.number.int()
      };
      const result = await request(app.getHttpServer())
        .get('/skills/filters')
        .query(filterSkillDto);        

      expect(result.status).toEqual(HttpStatus.OK);
      expect(mockedAuthGuard.canActivate).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByNameStartsWith).toHaveBeenCalledTimes(1);
      expect(mockedSkillRepository.findByNameStartsWith.mock.calls[0][0]).toBe(filterSkillDto.name);
      expect(mockedSkillRepository.findByNameStartsWith.mock.calls[0][1]).toMatchObject(
        { page: filterSkillDto.page, perPage: filterSkillDto.perPage }
      );
      expect(result.body.length).toBe(1);
      expect(result.body[0]).toMatchObject(skill);
    });
  });
});
