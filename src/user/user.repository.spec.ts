import { PrismaService } from '@prisma-module/prisma.service';
import { UserRepository } from './user.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from "child_process";
import * as util from "util";
import { Test } from '@nestjs/testing';
import { createCompanyUserDto, createTestUser, createTestUserDto, createUpdateProfileDto } from '@src/test-utils';
import { Role } from '@prisma/client';
import { faker } from '@faker-js/faker';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;

  const originalEnv = process.env;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });
  });

  afterAll(async () => {
    await container.stop();
  })

  beforeEach(async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: container.getConnectionUri(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [UserRepository, PrismaService],
    }).compile();

    userRepository = moduleRef.get<UserRepository>(UserRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);

    await prismaService.$transaction([
      prismaService.roleUser.deleteMany(),
      prismaService.companyUser.deleteMany(),
      prismaService.user.deleteMany(),
      prismaService.company.deleteMany()
    ]);
  });

  afterEach(() => {
    process.env = originalEnv;
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
      expect(usersCount === 1 && companiesCount === 1 && roleUsersCount === 1 && companyUsersCount === 1).toBeTruthy();
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
});
