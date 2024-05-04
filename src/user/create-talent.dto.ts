import { IsUserEmailAlreadyExist } from "@validation/user-email-constraint";
import { Type } from "class-transformer";
import { IsDate, IsDateString, IsEmail, IsNotEmpty, IsNumberString, IsOptional, MaxDate } from "class-validator";

export class CreateTalentDto {
  @IsUserEmailAlreadyExist()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  address?: string;

  @Type(() => Date)
  @MaxDate(() => new Date())
  @IsOptional()
  birthday?: Date;

  @IsNumberString()
  @IsOptional()
  phoneNumber?: string
}
