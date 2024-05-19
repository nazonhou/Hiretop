import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Authenticated } from '@user/authenticated.decorator';
import { CreateWorkExperienceDto } from './create-work-experience.dto';
import { TokenPayload } from '@auth/auth.service';
import { WorkExperienceService } from './work-experience.service';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { WorkExperienceEntity } from './work-experience.entity';

@ApiBearerAuth()
@ApiTags('work-experiences')
@Controller('work-experiences')
export class WorkExperienceController {
  constructor(private workExperienceService: WorkExperienceService) {}

  /**
   * Create a work experience
   */
  @Post()
  @ApiCreatedResponse({ type: WorkExperienceEntity })
  @HttpCode(HttpStatus.CREATED)
  registerWorkExperience(
    @Body() createWorkExperienceDto: CreateWorkExperienceDto,
    @Authenticated() user: TokenPayload
  ) {
    return this.workExperienceService.createWorkExperience(user, createWorkExperienceDto);
  }
}
