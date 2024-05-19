import { Skill } from "@prisma/client";

export class SkillEntity implements Skill {
  authorId: string;
  id: string;
  name: string;
}
