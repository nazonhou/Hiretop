import { Module } from '@nestjs/common';
import { PrismaModule } from '@prismaModule/prisma.module';
import { UserService } from '@user/user.service';
import { TalentController } from './talent.controller';
import { UserRepository } from './user.repository';

@Module({
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
  imports: [PrismaModule],
  controllers: [TalentController]
})
export class UserModule {}
