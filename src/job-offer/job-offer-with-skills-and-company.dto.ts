import { CompanyEntity } from "@company/company.entity";
import { JobOfferWithSkillsDto } from "./job-offer-with-skills.dto";

export class JobOfferWithSkillsAndCompanyDto extends JobOfferWithSkillsDto {
  company: CompanyEntity
}
