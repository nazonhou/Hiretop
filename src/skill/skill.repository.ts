import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateSkillDto } from "./create-skill.dto";
import { PaginationDto } from "@src/pagination.dto";

@Injectable()
export class SkillRepository {
  constructor(private prismaService: PrismaService) {}

  createSkill(
    authorId: string,
    { name }: CreateSkillDto
  ) {
    return this.prismaService.skill.create({
      data: {
        name,
        author: {
          connect: {
            id: authorId
          }
        }
      }
    })
  }

  findByAuthorId(authorId: string) {
    return this.prismaService.skill.findMany({
      where: {
        authorId
      }
    });
  }

  findOneByName(name: string) {
    return this.prismaService.skill.findUnique({ where: { name } });
  }

  findByIds(ids: string[]) {
    return this.prismaService.skill.findMany({
      where: { id: { in: ids } }
    });
  }

  findUserSkills(userId: string) {
    return this.prismaService.skill.findMany({
      where: { users: { some: { id: userId } } }
    })
  }

  findByNameStartsWith(startsWith: string, { page, perPage }: PaginationDto) {
    return this.prismaService.skill.findMany({
      where: { name: { startsWith } },
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage
    });
  }
}
