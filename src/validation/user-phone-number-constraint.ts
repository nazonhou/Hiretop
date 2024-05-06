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
    const [update] = args.constraints as [boolean | undefined];

    if (update === undefined || update === false) {
      return (await this.userRepository.findOneByPhoneNumber(value)) === null;
    }

    const injectedUser = (args.object as any)?.injected?.user;
    const user = await this.userRepository.findOneByPhoneNumber(value);

    if (!user || user.id == injectedUser?.sub) {
      return true;
    }

    return false;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "phoneNumber already used";
  }
}

export function IsUserPhoneNumberAlreadyExist(update?: boolean, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [update],
      validator: IsUserPhoneNumberAlreadyExistConstraint,
    });
  };
}