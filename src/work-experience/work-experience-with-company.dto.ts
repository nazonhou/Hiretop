import { CompanyEntity } from "@company/company.entity";
import { WorkExperienceEntity } from "./work-experience.entity";

export class WorkExperienceWithCompanyDto
  extends WorkExperienceEntity {
  company: CompanyEntity
}
