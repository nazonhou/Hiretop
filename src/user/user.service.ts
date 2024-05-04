import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '@prismaModule/prisma.service';
import { CreateTalentDto } from './create-talent.dto';
import { UserRepository } from './user.repository';
import { UserDto } from './user.dto';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
    private configService: ConfigService
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email }
    });
  }

  async create(createTalentDto: CreateTalentDto) {     
    const user = await this.userRepository.create({
      ...createTalentDto,
      password: await bcrypt.hash(createTalentDto.password, this.configService.get<number>("hash.saltRounds"))
    });
    return UserDto.fromUser(user);
  }
}
