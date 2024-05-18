import { OmitType } from "@nestjs/swagger";
import { CreateCompanyUserDto } from "./create-company-user.dto";

export class CreateTalentDto extends OmitType(
  CreateCompanyUserDto, ['companyName', 'presentation', 'culture', 'history', 'values'] as const
) {}
