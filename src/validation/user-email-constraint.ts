import { Injectable } from '@nestjs/common';
import { UserRepository } from '@user/user.repository';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsUserEmailAlreadyExistConstraint implements ValidatorConstraintInterface {
  constructor(private userRepository: UserRepository) {}

  async validate(email: string, args: ValidationArguments) {
    return (await this.userRepository.findOneByEmail(email)) === null;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "email already used";
  }
}

export function IsUserEmailAlreadyExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUserEmailAlreadyExistConstraint,
    });
  };
}