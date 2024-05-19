import { ApplicationFeedbackEntity } from "@application-feedback/application-feedback.entity";
import { ApiProperty } from "@nestjs/swagger";
import { $Enums, JobApplication } from "@prisma/client";

export class RejectJobApplicationResponseDto
  implements JobApplication {
  applicantId: string;
  appliedAt: Date;
  id: string;
  jobOfferId: string;
  @ApiProperty({ enum: $Enums.JobApplicationStatus })
  status: $Enums.JobApplicationStatus;
  applicationFeedback: ApplicationFeedbackEntity
}
