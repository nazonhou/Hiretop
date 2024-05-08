import { CompanyCategory } from "@prisma/client";
import { IsCompanyNameAlreadyExist } from "@validation/company-name-constraint";
import { IsUserEmailAlreadyExist } from "@validation/user-email-constraint";
import { IsUserPhoneNumberAlreadyExist } from "@validation/user-phone-number-constraint";
import { Type } from "class-transformer";
import { ArrayUnique, IsEmail, IsEnum, IsNotEmpty, IsNumberString, IsOptional, MaxDate } from "class-validator";

export class CreateCompanyUserDto {
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

  @IsUserPhoneNumberAlreadyExist()
  @IsNumberString()
  @IsOptional()
  phoneNumber?: string

  @IsCompanyNameAlreadyExist()
  @IsNotEmpty()
  companyName: string;

  @IsOptional()
  presentation?: string;

  @IsOptional()
  history?: string;

  @IsOptional()
  culture?: string;

  @ArrayUnique()
  values: string[]

  @IsEnum(CompanyCategory)
  @IsOptional()
  category?: CompanyCategory
}
