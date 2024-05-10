import { IsNotEmpty, IsNumber } from "class-validator";

export class PaginationDto {
  @IsNumber()
  @IsNotEmpty()
  perPage: number;
  
  @IsNumber()
  @IsNotEmpty()
  page: number;
}