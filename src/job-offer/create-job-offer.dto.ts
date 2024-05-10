import { JobType, LocationType } from "@prisma/client";
import { ArraySkill } from "@validation/array-skills-constraint";
import { Type } from "class-transformer";
import { IsArray, IsDate, IsEnum, IsNotEmpty, IsOptional, MinDate } from "class-validator";

export class CreateJobOfferDto {
  @IsNotEmpty()
  description: string;

  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @ArraySkill()
  @IsArray()
  skillIds: string[];

  @Type(() => Date)
  @MinDate(new Date())
  @IsDate()
  @IsNotEmpty()
  expiredAt: Date;
}
