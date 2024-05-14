import { PaginationDto } from "@src/pagination.dto";
import { IsNotEmpty } from "class-validator";

export class FilterCompanyDto extends PaginationDto {
  @IsNotEmpty()
  name: string;
}
