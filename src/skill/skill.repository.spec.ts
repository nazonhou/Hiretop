import { PrismaService } from '@prisma-module/prisma.service';
import { SkillRepository } from './skill.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { Test } from '@nestjs/testing';
import { cleanTestDatabase, createTestSkillDto, createTestUserDto, createTestingPrismaClient } from '@src/test-utils';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';

describe('SkillRepository', () => {
  let skillRepository: SkillRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;
  let TestingPrismaService: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(process.env.TESTING_DATABASE_IMAGE).start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });

    TestingPrismaService = createTestingPrismaClient(container.getConnectionUri());
    await TestingPrismaService.$connect();

    const moduleRef = await Test.createTestingModule({
      providers: [SkillRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    skillRepository = moduleRef.get<SkillRepository>(SkillRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  describe('createSkill', () => {
    it('should insert a new skill into the database', async () => {
      const data = createTestSkillDto();
      const { id: authorId } = await prismaService.user.create({ data: createTestUserDto() });
      const result = await skillRepository.createSkill(authorId, data);
      const skills = await prismaService.skill.findMany();
      expect(skills.length).toBe(1);
      expect(skills[0]).toMatchObject(result);
      expect(skills[0].authorId).toBe(authorId);
    });
  });

  describe('findByAuthorId', () => {
    it('Should find a record when it exists', async () => {
      const { id: authorId } = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: {
          name: faker.person.jobTitle(), author: { connect: { id: authorId } }
        }
      });
      const result = await skillRepository.findByAuthorId(authorId);
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject(skill);
    });
    it('Should not find any record when it does not exists', async () => {
      const authorId = faker.string.uuid();
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: {
          name: faker.person.jobTitle(), author: { connect: { id: user.id } }
        }
      });
      const result = await skillRepository.findByAuthorId(authorId);
      expect(result.length).toBe(0);
    });
  });

  describe('findOneByName', () => {
    it('Should find a record when it exists', async () => {
      const { id: authorId } = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: {
          name: faker.person.jobTitle(), author: { connect: { id: authorId } }
        }
      });
      const result = await skillRepository.findOneByName(skill.name);
      expect(result).toMatchObject(skill);
    });
    it('Should not find any record when it does not exists', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: {
          name: faker.person.jobTitle(), author: { connect: { id: user.id } }
        }
      });
      const result = await skillRepository.findOneByName("FAKE_NAME");
      expect(result).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('Should retrieve all skills when all ids refer to real skills', async () => {
      const { id: authorId } = await prismaService.user.create({ data: createTestUserDto() });
      const skills = await Promise.all([
        prismaService.skill.create({
          data: {
            name: faker.person.jobTitle(), author: { connect: { id: authorId } }
          }
        }),
        prismaService.skill.create({
          data: {
            name: faker.person.jobTitle(), author: { connect: { id: authorId } }
          }
        })
      ]);
      const result = await skillRepository.findByIds(skills.map(({ id }) => id));
      expect(result.length).toBe(2);
    });
    it('Should not retrieve a skill when the id does not exist', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: {
          name: faker.person.jobTitle(), author: { connect: { id: user.id } }
        }
      });
      const result = await skillRepository.findByIds([faker.string.uuid()]);
      expect(result.length).toBe(0);
    });
    it('Should throw an exception when id is not a valid UUID', async () => {
      expect(skillRepository.findByIds([faker.string.alphanumeric()])).rejects.toThrow();
    });
  });

  describe('findUserSkills', () => {
    it('Should retrieve a skill when its associated with the user', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const anotherUser = await prismaService.user.create({ data: createTestUserDto() });
      const skills = await Promise.all([
        prismaService.skill.create({
          data: {
            name: faker.person.jobTitle(), author: { connect: { id: user.id } }, users: { connect: [{ id: user.id }] }
          }
        }),
        prismaService.skill.create({
          data: {
            name: faker.person.jobTitle(), author: { connect: { id: user.id } }, users: { connect: [{ id: anotherUser.id }] }
          }
        })
      ]);
      const result = await skillRepository.findUserSkills(user.id);
      expect(result.length).toBe(1);
    });
    it('Should not retrieve a skill when its not associated with the user', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const anotherUser = await prismaService.user.create({ data: createTestUserDto() });
      const skills = await Promise.all([
        prismaService.skill.create({
          data: {
            name: faker.person.jobTitle(), author: { connect: { id: user.id } }, users: { connect: [{ id: anotherUser.id }] }
          }
        })
      ]);
      const result = await skillRepository.findUserSkills(user.id);
      expect(result.length).toBe(0);
    });
  });
});
