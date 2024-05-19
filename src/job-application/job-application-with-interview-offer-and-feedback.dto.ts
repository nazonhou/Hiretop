import { JobOfferWithSkillsAndCompanyDto } from "@job-offer/job-offer-with-skills-and-company.dto";
import { AcceptJobApplicationResponseDto } from "./accept-job-application.response.dto";

export class JobApplicationWithInterviewOfferAndFeedbackDto
  extends AcceptJobApplicationResponseDto {
  jobOffer: JobOfferWithSkillsAndCompanyDto
}
