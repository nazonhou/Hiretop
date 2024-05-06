import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateTalentDto } from "./create-talent.dto";
import { Role } from '@prisma/client';
import { CreateCompanyUserDto } from "./create-company-user-dto";
import { UpdateProfileDto } from "./update-profile-dto";

@Injectable()
export class UserRepository {
  constructor(private prismaService: PrismaService) {}

  create(createTalentDto: CreateTalentDto) {
    return this.prismaService.user.create({ data: createTalentDto });
  }

  async grantRoles(userId: string, roles: Role[]) {
    const actualRoles = (await this.prismaService.roleUser.findMany({ where: { userId } }))
      .map((userRole => userRole.role));

    const rolesToConnect = roles.filter(role => !actualRoles.includes(role));
    const rolesToDisconnect = actualRoles.filter(actualRole => !roles.includes(actualRole));

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
    const { companyName, presentation, values, history, culture, ...userData } = createCompanyUserDto;

    return this.prismaService.user.create({
      data: {
        ...userData,
        companyUser: {
          create: {
            company: {
              create: {
                name: companyName,
                presentation,
                values,
                history,
                culture
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
      data
    });
  }
}
