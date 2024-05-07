import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateSkillDto } from "./create-skill.dto";

@Injectable()
export class SkillRepository {
  constructor(private prismaService: PrismaService) {}

  createSkill(authorId: string, data: CreateSkillDto) {
    return this.prismaService.skill.create({
      data: {
        ...data,
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
}
