import { ApiProperty } from "@nestjs/swagger";
import { $Enums, WorkExperience } from "@prisma/client";

export class WorkExperienceEntity implements WorkExperience {
  companyId: string;
  description: string;
  endedAt: Date;
  id: string;
  location: string;
  @ApiProperty({ enum: $Enums.LocationType })
  locationType: $Enums.LocationType;
  startedAt: Date;
  title: string;
  @ApiProperty({ enum: $Enums.JobType })
  type: $Enums.JobType;
  userId: string;
}
