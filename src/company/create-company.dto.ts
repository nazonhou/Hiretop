import { CompanyCategory } from "@prisma/client";
import { IsCompanyNameAlreadyExist } from "@validation/company-name-constraint";
import { IsNotEmpty } from "class-validator";

export class CreateCompanyDto {
  @IsCompanyNameAlreadyExist()
  @IsNotEmpty()
  name: string;

  presentation?: string;

  history?: string;

  culture?: string;

  values: string[];

  category?: CompanyCategory;
}
