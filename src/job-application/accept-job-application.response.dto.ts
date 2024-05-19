import { JobInterviewEntity } from "@job-interview/job-interview.entity";
import { RejectJobApplicationResponseDto } from "./reject-job-application.response.dto";

export class AcceptJobApplicationResponseDto extends RejectJobApplicationResponseDto {
  jobInterview: JobInterviewEntity;
}
