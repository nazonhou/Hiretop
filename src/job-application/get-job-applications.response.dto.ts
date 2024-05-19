import { ApiProperty, PartialType } from "@nestjs/swagger";
import { JobApplicationDto } from "./job-application.dto";

export class GetJobApplicationsResponseDto {
  total: number;
  @ApiProperty({ type: [PartialType(JobApplicationDto)] })
  data: Partial<JobApplicationDto>[];
}
