import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateTalentDto } from './create-talent.dto';
import { UserService } from './user.service';
import { Public } from '@auth/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('talents')
@Controller('talents')
export class TalentController {
  constructor(private userService: UserService) {}

  /**
   * Self-registration as talent
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  register(
    @Body() CreateTalentDto: CreateTalentDto
  ) {
    return this.userService.create(CreateTalentDto);
  }
}
