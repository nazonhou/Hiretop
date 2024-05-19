import { SkillEntity } from "./skill.entity";

export class FilterSkillResponseDto {
  data: SkillEntity[];
  total: number;
}
