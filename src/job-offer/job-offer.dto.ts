import { OmitType } from "@nestjs/mapped-types";
import { RawJobOfferDto } from "./raw-job-offer.dto";

export class JobOfferDto extends OmitType(RawJobOfferDto, ['total_count'] as const) {}
