import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prismaModule/prisma.service";
import { CreateCompanyDto } from "./create-company.dto";

@Injectable()
export class CompanyRepository {
  constructor(private prismaService: PrismaService) {}

  create(createCompanyDto: CreateCompanyDto) {
    return this.prismaService.company.create({
      data: createCompanyDto
    });
  }
}
