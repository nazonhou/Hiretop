import { SkillEntity } from "@skill/skill.entity";
import { UserDto } from "./user.dto";
import { ApiProperty } from "@nestjs/swagger";
import { WorkExperienceWithCompanyDto } from "@work-experience/work-experience-with-company.dto";

export class UserWithSkillsAndWorkExperiencesDto extends UserDto {
  @ApiProperty({ type: [SkillEntity] })
  skills: SkillEntity[];
  workExperiences: WorkExperienceWithCompanyDto[];
}
