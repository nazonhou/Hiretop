import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './update-profile-dto';
import { Authenticated } from './user.decorator';
import { TokenPayload } from '@auth/auth.service';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.updateUserProfile(user, updateProfileDto);
  }
}