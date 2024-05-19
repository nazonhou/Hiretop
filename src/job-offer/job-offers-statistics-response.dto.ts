import { ApiProperty } from "@nestjs/swagger";
import { JobApplicationStatus } from "@prisma/client";

export class JobOffersStatisticsResponseDto {
  @ApiProperty({ enum: JobApplicationStatus })
  status: JobApplicationStatus;
  total: number;
}
