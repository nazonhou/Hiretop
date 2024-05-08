import { Injectable } from '@nestjs/common';
import { WorkExperienceRepository } from './work-experience.repository';
import { CreateWorkExperienceDto } from './create-work-experience.dto';
import { TokenPayload } from '@auth/auth.service';

@Injectable()
export class WorkExperienceService {
  constructor(private workExperienceRepository: WorkExperienceRepository) {}

  createWorkExperience(user: TokenPayload, createWorkExperienceDto: CreateWorkExperienceDto) {
    return this.workExperienceRepository.createWorkExperience(user.sub, createWorkExperienceDto);
  }
}
