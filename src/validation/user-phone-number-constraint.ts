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
export class IsUserPhoneNumberAlreadyExistConstraint implements ValidatorConstraintInterface {
  constructor(private userRepository: UserRepository) {}

  async validate(value: string, args: ValidationArguments) {
    return (await this.userRepository.findOneByPhoneNumber(value)) === null;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "phoneNumber already used";
  }
}

export function IsUserPhoneNumberAlreadyExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUserPhoneNumberAlreadyExistConstraint,
    });
  };
}