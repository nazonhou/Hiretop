import { JobInterview } from "@prisma/client";

export class JobInterviewEntity implements JobInterview {
  endedAt: Date;
  id: string;
  jobApplicationId: string;
  startedAt: Date;
}
