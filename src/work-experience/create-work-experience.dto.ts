import { ApiProperty } from "@nestjs/swagger";
import { JobType, LocationType } from "@prisma/client"
import { IsCompanyId } from "@validation/company-id-constraint";
import { IsYounger } from "@validation/younger-date-constraint";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsNotEmpty, IsOptional, MaxDate } from "class-validator";

export class CreateWorkExperienceDto {
  @IsNotEmpty()
  title: string;

  @IsEnum(JobType)
  @IsOptional()
  @ApiProperty({ enum: JobType })
  type?: JobType;

  @IsOptional()
  location?: string;

  @IsEnum(LocationType)
  @IsOptional()
  @ApiProperty({ enum: LocationType })
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
