import { Module, ValidationPipeOptions } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { IsUserEmailAlreadyExistConstraint } from './user-email-constraint';
import { UserModule } from '@user/user.module';
import { IsUserPhoneNumberAlreadyExistConstraint } from './user-phone-number-constraint';
import { IsCompanyNameAlreadyExistConstraint } from './company-name-constraint';
import { CompanyModule } from '@company/company.module';
import { IsSkillNameAlreadyExistConstraint } from './skill-name-constraint';
import { ArraySkillConstraint } from './array-skills-constraint';
import { IsCompanyIdConstraint } from './company-id-constraint';
import { SkillModule } from '@skill/skill.module';
import { JobInterviewModule } from '@job-interview/job-interview.module';
import { JobInterviewTimeConstraint } from './job-interview-time-constraint';
import { JobApplicationModule } from '@job-application/job-application.module';


@Module({
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe(getValidationPipeOptions()),
    },
    ValidationService,
    IsUserEmailAlreadyExistConstraint,
    IsUserPhoneNumberAlreadyExistConstraint,
    IsCompanyNameAlreadyExistConstraint,
    IsSkillNameAlreadyExistConstraint,
    ArraySkillConstraint,
    IsCompanyIdConstraint,
    JobInterviewTimeConstraint
  ],
  imports: [UserModule, CompanyModule, SkillModule, JobInterviewModule, JobApplicationModule]
})
export class ValidationModule {}

export function exceptionFactory(errors: ValidationError[]) {
  const response: { [property: string]: string[] } = {};
  errors.forEach(error => {
    response[error.property] = Object.entries(error.constraints).map(constraint => constraint[1]);
  });
  return new UnprocessableEntityException(response)
};

export function getValidationPipeOptions(): ValidationPipeOptions {
  return {
    whitelist: false,
    transform: true,
    exceptionFactory,
    transformOptions: { enableImplicitConversion: true },
  };
} 
