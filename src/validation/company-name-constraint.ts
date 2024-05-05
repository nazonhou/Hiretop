import { CompanyRepository } from '@company/company.repository';
import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class IsCompanyNameAlreadyExistConstraint implements ValidatorConstraintInterface {
  constructor(private companyRepository: CompanyRepository) {}

  async validate(value: string, args: ValidationArguments) {
    return (await this.companyRepository.findOneByName(value)) === null;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "company name already used";
  }
}

export function IsCompanyNameAlreadyExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCompanyNameAlreadyExistConstraint,
    });
  };
}