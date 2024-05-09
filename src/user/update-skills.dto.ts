import { ArraySkill } from "@validation/array-skills-constraint";
import { ArrayNotEmpty, IsArray } from "class-validator";

export class UpdateSkillsDto {
  @ArraySkill()
  @ArrayNotEmpty()
  @IsArray()
  skillIds: string[];
}
