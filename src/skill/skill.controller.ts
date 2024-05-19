import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FilterSkillDto } from './filter-skill.dto';
import { SkillService } from './skill.service';

@ApiBearerAuth()
@ApiTags('skills')
@Controller('skills')
export class SkillController {
  constructor(private skillService: SkillService) {}

  @Get('filters')
  filterSkills(@Query() filterSkillsDto: FilterSkillDto) {
    return this.skillService.findByNameStartsWith(filterSkillsDto);
  }
}
