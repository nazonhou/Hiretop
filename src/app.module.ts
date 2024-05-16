import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { ValidationModule } from './validation/validation.module';
import { RequestInterceptorModule } from './request-interceptor/request-interceptor.module';
import { SkillModule } from './skill/skill.module';
import { WorkExperienceModule } from './work-experience/work-experience.module';
import { JobOfferModule } from './job-offer/job-offer.module';
import { JobApplicationModule } from './job-application/job-application.module';
import { JobInterviewModule } from './job-interview/job-interview.module';
import jwtConfig from '@config/jwt.config';
import hashConfig from '@config/hash.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [jwtConfig, hashConfig],
      isGlobal: true
    }),
    AuthModule,
    UserModule,
    PrismaModule,
    CompanyModule,
    ValidationModule,
    RequestInterceptorModule,
    SkillModule,
    WorkExperienceModule,
    JobOfferModule,
    JobApplicationModule,
    JobInterviewModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
