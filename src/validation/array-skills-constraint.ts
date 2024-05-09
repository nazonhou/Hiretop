import { Injectable } from '@nestjs/common';
import { SkillRepository } from '@skill/skill.repository';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: true })
@Injectable()
export class ArraySkillConstraint implements ValidatorConstraintInterface {
  constructor(private skillRepository: SkillRepository) {}

  async validate(value: string[], args: ValidationArguments) {
    try {
      return (await this.skillRepository.findByIds(value)).length === value.length;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "some values are not valid";
  }
}

export function ArraySkill(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: ArraySkillConstraint,
    });
  };
}