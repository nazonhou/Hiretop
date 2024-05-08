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
export class IsCompanyIdConstraint implements ValidatorConstraintInterface {
  constructor(private companyRepository: CompanyRepository) {}

  async validate(value: string, args: ValidationArguments) {
    try {
      return (await this.companyRepository.findOneById(value)) !== null;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "company does not exist";
  }
}

export function IsCompanyId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCompanyIdConstraint,
    });
  };
}