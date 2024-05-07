import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './update-profile-dto';
import { Authenticated } from './user.decorator';
import { TokenPayload } from '@auth/auth.service';
import { CreateSkillDto } from '@skill/create-skill.dto';

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

  @Post('skills')
  @HttpCode(HttpStatus.CREATED)
  createSkill(
    @Body() createSkillDto: CreateSkillDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.createSkill(user, createSkillDto);
  }
}