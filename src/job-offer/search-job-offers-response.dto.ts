import { ApiProperty, PartialType } from "@nestjs/swagger";
import { JobOfferDto } from "./job-offer.dto";

export class SearchJobOffersResponseDto {
  total: number;
  @ApiProperty({ type: [PartialType(JobOfferDto)] })
  data: Partial<JobOfferDto>[]
}
