import { PaginationDto } from "@src/pagination.dto";
import { IsNotEmpty } from "class-validator";

export class FilterSkillDto extends PaginationDto {
  @IsNotEmpty()
  name: string;
}
