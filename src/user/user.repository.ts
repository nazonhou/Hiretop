import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prismaModule/prisma.service";
import { CreateTalentDto } from "./create-talent.dto";
import { Role } from '@prismaModule/client';

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
}
