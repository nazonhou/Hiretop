import { Module } from '@nestjs/common';
import { SkillRepository } from './skill.repository';
import { SkillController } from './skill.controller';
import { SkillService } from './skill.service';

@Module({
  providers: [SkillRepository, SkillService],
  exports: [SkillRepository],
  controllers: [SkillController]
})
export class SkillModule {}
