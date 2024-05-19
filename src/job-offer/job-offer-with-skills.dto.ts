import { SkillEntity } from "@skill/skill.entity";
import { JobOfferEntity } from "./job-offer.entity";
import { ApiProperty } from "@nestjs/swagger";

export class JobOfferWithSkillsDto extends JobOfferEntity {
  @ApiProperty({ type: [SkillEntity] })
  skills: SkillEntity[];
}
