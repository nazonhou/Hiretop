import { IsSkillNameAlreadyExist } from "@validation/skill-name-constraint";
import { IsNotEmpty } from "class-validator";

export class CreateSkillDto {
  @IsSkillNameAlreadyExist()
  @IsNotEmpty()
  name: string;
}
