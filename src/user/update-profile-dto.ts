import { OmitType } from "@nestjs/mapped-types";
import { CreateTalentDto } from "./create-talent.dto";
import { IsNumberString, IsOptional } from "class-validator";
import { IsUserPhoneNumberAlreadyExist } from "@validation/user-phone-number-constraint";

export class UpdateProfileDto extends OmitType(CreateTalentDto, ['email', 'password', 'phoneNumber']) {
  @IsUserPhoneNumberAlreadyExist(true)
  @IsNumberString()
  @IsOptional()
  phoneNumber?: string
}
