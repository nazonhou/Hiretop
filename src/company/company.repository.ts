import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateCompanyDto } from "./create-company.dto";
import { PaginationDto } from "@src/pagination.dto";

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

  findByNameStartsWith(startsWith: string, { page, perPage }: PaginationDto) {
    return this.prismaService.company.findMany({
      where: {
        name: { startsWith }
      },
      orderBy: {
        name: "asc"
      },
      skip: (page - 1) * perPage,
      take: perPage
    })
  }
}
