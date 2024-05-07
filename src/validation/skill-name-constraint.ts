import { Injectable } from "@nestjs/common";
import { SkillRepository } from "@skill/skill.repository";
import { ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";

@Injectable()
@ValidatorConstraint({ async: true })
export class IsSkillNameAlreadyExistConstraint implements ValidatorConstraintInterface {
  constructor(private skillRepository: SkillRepository) {}

  async validate(value: string, args: ValidationArguments) {
    return await this.skillRepository.findOneByName(value) === null;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "name already used";
  }
}

export function IsSkillNameAlreadyExist(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSkillNameAlreadyExistConstraint,
    });
  };
}