import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { CreateTalentDto } from './create-talent.dto';
import { UserRepository } from './user.repository';
import { UserDto } from './user.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { CreateCompanyUserDto } from './create-company-user-dto';
import { TokenPayload } from '@auth/auth.service';
import { UpdateProfileDto } from './update-profile-dto';
import { SkillRepository } from '@skill/skill.repository';
import { CreateSkillDto } from '@skill/create-skill.dto';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private configService: ConfigService,
    private skillRepository: SkillRepository
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneByEmail(email);
  }

  async create(createTalentDto: CreateTalentDto) {
    const user = await this.userRepository.create({
      ...createTalentDto,
      password: await bcrypt.hash(createTalentDto.password, this.configService.get<number>("hash.saltRounds"))
    });
    return UserDto.fromUser(user);
  }

  async createCompanyUser(createCompanyUserDto: CreateCompanyUserDto) {
    const user = await this.userRepository.createCompanyUser({
      ...createCompanyUserDto,
      password: await bcrypt.hash(createCompanyUserDto.password, this.configService.get<number>("hash.saltRounds"))
    });
    return UserDto.fromUser(user);
  }

  async updateUserProfile(payload: TokenPayload, data: UpdateProfileDto) {
    const user = await this.userRepository.updateUser(payload.sub, data);
    return UserDto.fromUser(user);
  }

  createSkill(user: TokenPayload, createSkillDto: CreateSkillDto) {
    return this.skillRepository.createSkill(user.sub, createSkillDto);
  }
}
