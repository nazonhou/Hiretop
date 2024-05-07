import { ArraySkill } from "@validation/user-skills-constraint";
import { ArrayNotEmpty, IsArray } from "class-validator";

export class UpdateSkillsDto {
  @ArraySkill()
  @ArrayNotEmpty()
  @IsArray()
  skillIds: string[];
}
