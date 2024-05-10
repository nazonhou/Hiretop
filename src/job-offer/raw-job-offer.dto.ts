import { CompanyCategory, JobType, LocationType } from "@prisma/client";

export class RawJobOfferDto {
  id: string;
  description: string;
  type: JobType;
  location_type: LocationType;
  company_id: string;
  posted_at: Date;
  expired_at: Date;
  author_id: string;
  company_name: string;
  matched_skills: number;
  total_skills: number;
  matching_rate: number;
  company_category: CompanyCategory;
  total_count: number;
}
