import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { UnprocessableEntityException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ValidationService } from './validation.service';
import { IsUserEmailAlreadyExistConstraint } from './user-email-constraint';
import { UserModule } from '@user/user.module';


@Module({
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true, exceptionFactory }),
    },
    ValidationService,
    IsUserEmailAlreadyExistConstraint
  ],
  imports: [UserModule]
})
export class ValidationModule {}

function exceptionFactory(errors: ValidationError[]) {
  const response: { [property: string]: string[] } = {};
  errors.forEach(error => {
    response[error.property] = Object.entries(error.constraints).map(constraint => constraint[1]);
  });
  return new UnprocessableEntityException(response)
};
