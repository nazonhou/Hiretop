import { ApiProperty } from "@nestjs/swagger";
import { $Enums, Company } from "@prisma/client";

export class CompanyEntity implements Company {
  @ApiProperty({ enum: $Enums.CompanyCategory })
  category: $Enums.CompanyCategory;
  culture: string;
  history: string;
  id: string;
  name: string;
  presentation: string;
  values: string[];
}
