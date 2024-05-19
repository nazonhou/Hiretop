import { Injectable } from '@nestjs/common';
import { SkillRepository } from './skill.repository';
import { FilterSkillDto } from './filter-skill.dto';
import { SkillEntity } from './skill.entity';

@Injectable()
export class SkillService {
  constructor(private skillRepository: SkillRepository) {}

  async findByNameStartsWith(filterSkillDto: FilterSkillDto): Promise<SkillEntity[]> {
    return this.skillRepository.findByNameStartsWith(
      filterSkillDto.name, { page: filterSkillDto.page, perPage: filterSkillDto.perPage }
    )
  }
}
