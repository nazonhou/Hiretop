import { ApiProperty } from "@nestjs/swagger";
import { $Enums, CompanyCategory, JobType, LocationType } from "@prisma/client";
import { PaginationDto } from "@src/pagination.dto";
import { IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class SearchJobOfferDto extends PaginationDto {
  @ApiProperty({ enum: $Enums.JobType })
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @ApiProperty({ enum: $Enums.LocationType })
  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @ApiProperty({ enum: $Enums.CompanyCategory })
  @IsEnum(CompanyCategory)
  @IsOptional()
  companyCategory?: CompanyCategory;
}
