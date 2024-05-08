import { JobType, LocationType } from "@prisma/client"
import { IsCompanyId } from "@validation/company-id-constraint";
import { IsYounger } from "@validation/younger-date-constraint";
import { Type } from "class-transformer";
import { IsDate, IsDateString, IsEnum, IsNotEmpty, IsOptional, MaxDate } from "class-validator";

export class CreateWorkExperienceDto {
  @IsNotEmpty()
  title: string;

  @IsEnum(JobType)
  @IsOptional()
  type?: JobType;

  @IsOptional()
  location?: string;

  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @IsOptional()
  description?: string;

  @Type(() => Date)
  @MaxDate(() => new Date())
  @IsDate()
  startedAt: Date;

  @Type(() => Date)
  @IsYounger("startedAt")
  @IsDate()
  @IsOptional()
  endedAt?: Date;

  @IsCompanyId()
  @IsNotEmpty()
  companyId: string;
}
