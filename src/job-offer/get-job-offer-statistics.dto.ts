import { PickType } from "@nestjs/mapped-types";
import { SearchJobOfferDto } from "./search-job-offer.dto";
import { Type } from "class-transformer";
import { IsDate, IsNotEmpty } from "class-validator";
import { IsYounger } from "@validation/younger-date-constraint";

export class GetJobOfferStatisticsDto extends PickType(SearchJobOfferDto, ['jobType', 'locationType'] as const) {
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  start: Date;

  @Type(() => Date)
  @IsYounger('start')
  @IsDate()
  @IsNotEmpty()
  end: Date;
}
