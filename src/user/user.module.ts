import { Module } from '@nestjs/common';
import { PrismaModule } from '@prisma-module/prisma.module';
import { UserService } from '@user/user.service';
import { TalentController } from './talent.controller';
import { UserRepository } from './user.repository';
import { CompanyUserController } from './company-user.controller';
import { UserController } from './user.controller';

@Module({
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
  imports: [PrismaModule],
  controllers: [TalentController, CompanyUserController, UserController]
})
export class UserModule {}
