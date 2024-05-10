import { CompanyCategory, JobType, LocationType } from "@prisma/client";
import { PaginationDto } from "@src/pagination.dto";
import { IsEnum, IsNotEmpty, IsOptional } from "class-validator";

export class SearchJobOfferDto extends PaginationDto {
  @IsEnum(JobType)
  @IsOptional()
  jobType?: JobType;

  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @IsEnum(CompanyCategory)
  @IsOptional()
  companyCategory?: CompanyCategory;
}
