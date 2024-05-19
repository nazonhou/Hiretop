import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateTalentDto } from "./create-talent.dto";
import { Role } from '@prisma/client';
import { CreateCompanyUserDto } from "./create-company-user.dto";
import { UpdateProfileDto } from "./update-profile-dto";

@Injectable()
export class UserRepository {
  constructor(private prismaService: PrismaService) {}

  create(createTalentDto: CreateTalentDto) {
    return this.prismaService.user.create({
      data: {
        email: createTalentDto.email,
        address: createTalentDto.address,
        birthday: createTalentDto.birthday,
        name: createTalentDto.name,
        password: createTalentDto.password,
        phoneNumber: createTalentDto.phoneNumber,
      }
    });
  }

  async grantRoles(userId: string, roles: Role[]) {
    const currentRoles = (await this.prismaService.roleUser.findMany({ where: { userId } }))
      .map((userRole => userRole.role));

    const rolesToConnect = roles.filter(role => !currentRoles.includes(role));
    const rolesToDisconnect = currentRoles.filter(actualRole => !roles.includes(actualRole));

    await Promise.all([
      this.prismaService.roleUser.deleteMany({
        where: {
          userId,
          role: {
            in: rolesToDisconnect
          }
        }
      }),
      this.prismaService.roleUser.createMany({
        data: rolesToConnect.map(role => ({
          role,
          userId
        }))
      })
    ]);
  }

  findOneByEmail(email: string) {
    return this.prismaService.user.findUnique({
      where: { email }
    });
  }

  findOneByPhoneNumber(phoneNumber: string) {
    return this.prismaService.user.findUnique({
      where: { phoneNumber }
    });
  }

  createCompanyUser(createCompanyUserDto: CreateCompanyUserDto) {
    const { companyName, presentation, values, history, culture, category, ...userData } = createCompanyUserDto;

    return this.prismaService.user.create({
      data: {
        email: userData.email,
        address: userData.address,
        birthday: userData.birthday,
        name: userData.name,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        companyUser: {
          create: {
            company: {
              create: {
                name: companyName,
                presentation,
                values,
                history,
                culture,
                category
              }
            }
          }
        },
        rolesUser: {
          create: [{ role: Role.COMPANY }]
        }
      },
    });
  }

  updateUser(id: string, data: UpdateProfileDto) {
    return this.prismaService.user.update({
      where: { id },
      data: {
        address: data.address,
        birthday: data.birthday,
        name: data.name,
        phoneNumber: data.phoneNumber
      }
    });
  }

  async updateSkills(userId: string, skillIds: string[]) {
    const currentSkillIds = (await this.prismaService.skill.findMany({ where: { users: { some: { id: userId } } } }))
      .map(skill => skill.id);

    const skillIdsToDeconnect = currentSkillIds.filter(currentSkillId => !skillIds.includes(currentSkillId));
    const skillIdsToConnect = skillIds.filter(skillId => !currentSkillIds.includes(skillId));

    const userWithUpdatedSkills = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        skills: {
          connect: skillIdsToConnect.map(id => ({ id })),
          disconnect: skillIdsToDeconnect.map(id => ({ id })),
        }
      },
      include: { skills: true }
    });

    return userWithUpdatedSkills.skills
  }

  findOneById(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        companyUser: { include: { company: true } },
        rolesUser: true
      }
    });
  }
}
