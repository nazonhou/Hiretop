import { ApiProperty } from "@nestjs/swagger";
import { $Enums, JobOffer } from "@prisma/client";

export class JobOfferEntity implements JobOffer {
  authorId: string;
  companyId: string;
  description: string;
  expiredAt: Date;
  id: string;
  @ApiProperty({ enum: $Enums.LocationType })
  locationType: $Enums.LocationType;
  postedAt: Date;
  @ApiProperty({ enum: $Enums.JobType })
  type: $Enums.JobType;
}
