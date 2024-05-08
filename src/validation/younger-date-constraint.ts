import { ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";

@ValidatorConstraint({ async: true })
class IsYoungerConstraint implements ValidatorConstraintInterface {
  async validate(value: Date, args: ValidationArguments) {
    try {
      const [field] = args.constraints as [string];
      const presumedOlder = new Date((args.object as any)[field]);
      return value > presumedOlder;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return `${validationArguments.property} is not younger than ${validationArguments.constraints[0]}`;
  }
}

export function IsYounger(field: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [field],
      validator: IsYoungerConstraint,
    });
  };
}


