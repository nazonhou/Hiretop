import { Module } from '@nestjs/common';
import { WorkExperienceRepository } from './work-experience.repository';
import { WorkExperienceController } from './work-experience.controller';
import { WorkExperienceService } from './work-experience.service';

@Module({
  providers: [WorkExperienceRepository, WorkExperienceService],
  controllers: [WorkExperienceController]
})
export class WorkExperienceModule {}
