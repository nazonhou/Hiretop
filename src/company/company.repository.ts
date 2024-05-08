import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateCompanyDto } from "./create-company.dto";

@Injectable()
export class CompanyRepository {
  constructor(private prismaService: PrismaService) {}

  create(createCompanyDto: CreateCompanyDto) {
    return this.prismaService.company.create({
      data: createCompanyDto
    });
  }

  createCompanyUser(userId: string, companyId: string) {
    return this.prismaService.companyUser.create({
      data: { userId, companyId }
    });
  }

  findOneByName(name: string) {
    return this.prismaService.company.findUnique({ where: { name } });
  }

  findOneById(id: string) {
    return this.prismaService.company.findUnique({ where: { id } });
  }
}
