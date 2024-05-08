import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Authenticated } from '@user/user.decorator';
import { CreateWorkExperienceDto } from './create-work-experience.dto';
import { TokenPayload } from '@auth/auth.service';
import { WorkExperienceService } from './work-experience.service';

@Controller('work-experiences')
export class WorkExperienceController {
  constructor(private workExperienceService: WorkExperienceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  registerWorkExperience(
    @Body() createWorkExperienceDto: CreateWorkExperienceDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.workExperienceService.createWorkExperience(user, createWorkExperienceDto);
  }
}
