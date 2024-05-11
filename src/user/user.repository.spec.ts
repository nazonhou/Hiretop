import { PrismaService } from '@prisma-module/prisma.service';
import { UserRepository } from './user.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from "child_process";
import * as util from "util";
import { Test } from '@nestjs/testing';
import { cleanTestDatabase, createCompanyUserDto, createTestCompanyDto, createTestSkillDto, createTestUserDto, createTestingPrismaClient, createUpdateProfileDto } from '@src/test-utils';
import { PrismaClient, Role } from '@prisma/client';
import { faker } from '@faker-js/faker';

describe('UserRepository', () => {
  let userRepository: UserRepository;
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
      providers: [UserRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  it('should be defined', () => {
    expect(userRepository).toBeDefined();
    expect(prismaService).toBeDefined();
  });

  describe("create method", () => {
    it("should insert a new user into the database", async () => {
      const createTalentDto = createTestUserDto();
      const result = await userRepository.create(createTalentDto);
      expect(await prismaService.user.count()).toBe(1);
      expect(await prismaService.user.findUnique({ where: { id: result.id } })).not.toBeNull();
    });
  });

  describe("grantRoles method", () => {
    it('should disconnect role when inputs roles does not include an existing role', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      await prismaService.roleUser.create({
        data: {
          role: Role.ADMIN,
          userId: user.id
        }
      });
      await userRepository.grantRoles(user.id, []);
      expect(await prismaService.roleUser.count()).toBe(0);
    });

    it('should connect role when existing roles does not include an input role', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      await userRepository.grantRoles(user.id, [Role.ADMIN]);
      expect(await prismaService.roleUser.count()).toBe(1);
      expect((await prismaService.roleUser.findFirst({ where: { userId: user.id } })).role).toBe(Role.ADMIN);
    });

    it('should not do anything when an existing role is present on inputs', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      await prismaService.roleUser.create({
        data: {
          role: Role.ADMIN,
          userId: user.id
        }
      });
      await userRepository.grantRoles(user.id, [Role.ADMIN]);
      expect(await prismaService.roleUser.count()).toBe(1);
    });
  });

  describe("findOneByEmail method", () => {
    it("should return a user when email exist", async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneByEmail(user.email);
      expect(user.id).toBe(result.id);
    });

    it("should return null when email does not exist", async () => {
      await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneByEmail(faker.internet.email());
      expect(result).toBeNull();
    });
  });

  describe("findOneByPhoneNumber method", () => {
    it("should return a user when phoneNumber exist", async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneByPhoneNumber(user.phoneNumber);
      expect(user.id).toBe(result.id);
    });

    it("should return null when phoneNumber does not exist", async () => {
      await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneByPhoneNumber(faker.phone.number());
      expect(result).toBeNull();
    });
  });

  describe("createCompanyUser", () => {
    it("should insert a user with a Role COMPANY, a company and link them together", async () => {
      const dto = createCompanyUserDto();
      const result = await userRepository.createCompanyUser(dto);
      const user = await prismaService.user.findUnique({
        where: { email: dto.email },
        include: {
          rolesUser: true,
          companyUser: { include: { company: true } }
        }
      });

      const [usersCount, companiesCount, roleUsersCount, companyUsersCount] = await Promise.all([
        prismaService.user.count(),
        prismaService.company.count(),
        prismaService.roleUser.count(),
        prismaService.companyUser.count()
      ]);

      expect(result.id).toBe(user.id);
      expect(user.rolesUser[0].role).toBe(Role.COMPANY);
      expect(user.companyUser.company.name).toBe(dto.companyName);
      expect(user.companyUser.company.category).toBe(dto.category);
      expect(usersCount === 1 && companiesCount === 1 && roleUsersCount === 1 && companyUsersCount === 1).toBeTruthy();
    });
    it("should throw an exception when attempting to link a companyUser with another company", async () => {
      const dto = createCompanyUserDto();
      const [user, company] = await Promise.all([
        userRepository.createCompanyUser(dto),
        prismaService.company.create({ data: createTestCompanyDto() })
      ]);

      expect(prismaService.companyUser.create({ data: { companyId: company.id, userId: user.id } }))
        .rejects
        .toThrow();
    });
  });

  describe("updateUser", () => {
    it("should update a user", async () => {
      const data = createUpdateProfileDto();
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.updateUser(user.id, data);

      expect(result.id).toBe(user.id);
      expect(result).toMatchObject(data);
    });
  });

  describe('updateSkills', () => {
    it("Should add a skill when current skills does not include it", async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({ data: { ...createTestSkillDto(), authorId: user.id } });
      const result = await userRepository.updateSkills(user.id, [skill.id]);

      expect((await prismaService.skill.findMany({ where: { users: { some: { id: user.id } } } })).length).toBe(1);
      expect(result[0]).toMatchObject(skill);
    });
    it("Should remove a skill when present in current skills but not in skills to update", async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const skill = await prismaService.skill.create({
        data: { ...createTestSkillDto(), authorId: user.id, users: { connect: [{ id: user.id }] } },
      });
      const result = await userRepository.updateSkills(user.id, []);

      expect((await prismaService.skill.findMany({ where: { users: { some: { id: user.id } } } })).length).toBe(0);
    });
  });


  describe("findOneById", () => {
    it("should find a user when it exists", async () => {
      const [user, company] = await Promise.all([
        prismaService.user.create({ data: createTestUserDto() }),
        prismaService.company.create({ data: createTestCompanyDto() })
      ]);

      const role = faker.helpers.enumValue(Role);

      await Promise.all([
        prismaService.roleUser.create({
          data: { role, user: { connect: { id: user.id } } }
        }),
        prismaService.companyUser.create({
          data: {
            company: { connect: { id: company.id } },
            user: { connect: { id: user.id } }
          }
        })
      ]);

      const result = await userRepository.findOneById(user.id);

      expect(result).toMatchObject(user);
      expect(result.rolesUser.length).toBe(1);
      expect(result.rolesUser[0].role).toBe(role);
      expect(result.companyUser).not.toBeNull();
      expect(result.companyUser.company).toMatchObject(company);
    });
    it("should not find a user when it does not exists", async () => {
      await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneById(faker.string.uuid());
      expect(result).toBeNull();
    });
    it("should find a user with any roles and no company when it does not have", async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const result = await userRepository.findOneById(user.id);
      expect(result).not.toBeNull();
      expect(result.rolesUser.length).toBe(0);
      expect(result.companyUser).toBeNull();
      expect(result).toMatchObject(user);
    });
  });
});
