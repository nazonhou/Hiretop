import { OmitType } from "@nestjs/mapped-types";
import { CreateTalentDto } from "./create-talent.dto";
import { User } from '@prisma/client';

export class UserDto extends OmitType(CreateTalentDto, ['password'] as const) {
  id: string;

  static fromUser(user: User): UserDto {
    const { password, ...userDto } = user;
    return userDto;
  }
}
