import { JobApplicationWithInterviewOfferAndFeedbackDto } from "./job-application-with-interview-offer-and-feedback.dto";

export class GetApplicationsForApplicantResponseDto {
  total: number;
  data: JobApplicationWithInterviewOfferAndFeedbackDto[]
}
