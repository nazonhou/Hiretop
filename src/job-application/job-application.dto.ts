import { OmitType } from "@nestjs/swagger";
import { RawJobApplicationDto } from "./raw-job-application.dto";

export class JobApplicationDto extends OmitType(RawJobApplicationDto, ['totalCount'] as const) {}
