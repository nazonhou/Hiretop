import { JobApplicationRepository } from "@job-application/job-application.repository";
import { JobInterviewRepository } from "@job-interview/job-interview.repository";
import { Injectable } from "@nestjs/common";
import { JobApplication } from "@prisma/client";
import { ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, registerDecorator } from "class-validator";

@Injectable()
@ValidatorConstraint({ async: true })
export class JobInterviewTimeConstraint implements ValidatorConstraintInterface {
  constructor(
    private jobInterviewRepository: JobInterviewRepository,
    private jobApplicationRepository: JobApplicationRepository
  ) {}

  async validate(value: Date, args: ValidationArguments) {
    const jobApplication = (args.object as any)?.injected?.jobApplication as JobApplication & { jobOffer: { companyId: string } };
    try {
      const startedAt = new Date(value);
      const endedAt = new Date((args.object as any)?.endedAt);
      if (!startedAt?.getTime() || !endedAt?.getTime()) {
        return false;
      }
      return (await this.jobInterviewRepository.findJobInterviewsWhichOverlaps(
        startedAt,
        endedAt,
        jobApplication.jobOffer.companyId
      )).length == 0;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    return "duration overlaps another interview";
  }
}

export function JobInterviewTimeNotOverlaps(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: JobInterviewTimeConstraint,
    });
  };
}
