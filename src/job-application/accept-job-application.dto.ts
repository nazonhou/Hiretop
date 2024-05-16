import { Type } from "class-transformer";
import { RejectJobApplicationDto } from "./reject-job-application.dto";
import { IsYounger } from "@validation/younger-date-constraint";
import { IsDate, IsNotEmpty, IsOptional, MinDate } from "class-validator";
import { JobInterviewTimeNotOverlaps } from "@validation/job-interview-time-constraint";

export class AcceptJobApplicationDto extends RejectJobApplicationDto {
  @Type(() => Date)
  @JobInterviewTimeNotOverlaps()
  @MinDate(() => new Date())
  @IsDate()
  @IsNotEmpty()
  startedAt: Date;

  @Type(() => Date)
  @IsYounger("startedAt")
  @IsDate()
  @IsNotEmpty()
  endedAt: Date;
}
