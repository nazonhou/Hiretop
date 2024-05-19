import { ApplicationFeedback } from "@prisma/client";

export class ApplicationFeedbackEntity implements ApplicationFeedback {
  id: string;
  jobApplicationId: string;
  message: string;
  sentAt: Date;
}
