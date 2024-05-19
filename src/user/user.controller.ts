import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './update-profile-dto';
import { Authenticated } from './authenticated.decorator';
import { TokenPayload } from '@auth/auth.service';
import { CreateSkillDto } from '@skill/create-skill.dto';
import { UpdateSkillsDto } from './update-skills.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkillEntity } from '@skill/skill.entity';

@ApiBearerAuth()
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Update user profile
   */
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  updateProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.updateUserProfile(user, updateProfileDto);
  }

  /**
   * Create a new skill
   */
  @Post('skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SkillEntity })
  createSkill(
    @Body() createSkillDto: CreateSkillDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.createSkill(user, createSkillDto);
  }

  /**
   * Update user skills
   */
  @Put('skills')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [SkillEntity] })
  updateSkills(
    @Body() updateSkillsDto: UpdateSkillsDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.updateSkills(user, updateSkillsDto);
  }

  /**
   * Get user skills
   */
  @Get('skills')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: [SkillEntity] })
  getSkills(
    @Authenticated() user: TokenPayload
  ) {
    return this.userService.findUserSkills(user.sub);
  }
}