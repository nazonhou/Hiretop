import { ApiProperty } from "@nestjs/swagger";
import { $Enums, JobApplication } from "@prisma/client";

export class JobApplicationEntity implements JobApplication {
  applicantId: string;
  appliedAt: Date;
  id: string;
  jobOfferId: string;
  @ApiProperty({ enum: $Enums.JobApplicationStatus })
  status: $Enums.JobApplicationStatus;
}
