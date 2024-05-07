import { CreateTalentDto } from "@user/create-talent.dto";
import { faker } from '@faker-js/faker';
import { Company, User } from '@prisma/client';
import { CreateCompanyDto } from "@company/create-company.dto";
import { CreateCompanyUserDto } from "@user/create-company-user.dto";
import { UpdateProfileDto } from "@user/update-profile-dto";
import { TokenPayload } from "@auth/auth.service";
import { Request, Response, NextFunction } from 'express';
import { CreateSkillDto } from "@skill/create-skill.dto";
import { UpdateSkillsDto } from "@user/update-skills.dto";

export function createTestUserDto(): CreateTalentDto {
  const dto = new CreateTalentDto();
  dto.address = faker.location.streetAddress();
  dto.birthday = faker.date.birthdate();
  dto.email = faker.internet.email();
  dto.name = faker.person.fullName();
  dto.phoneNumber = faker.string.numeric({ length: { min: 8, max: 10 } }),
    dto.password = faker.internet.password();
  return dto;
}

export function createTestUser(): User {
  return {
    id: faker.string.uuid(),
    address: faker.location.streetAddress(),
    birthday: faker.date.birthdate(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    phoneNumber: faker.string.numeric({ length: { min: 8, max: 10 } }),
    password: faker.internet.password(),
  };
}

export function createTestCompanyDto() {
  const createCompanyDto = new CreateCompanyDto();
  createCompanyDto.culture = faker.lorem.paragraph();
  createCompanyDto.history = faker.lorem.paragraph();
  createCompanyDto.presentation = faker.lorem.paragraph();
  createCompanyDto.values = [faker.lorem.paragraph()];
  createCompanyDto.name = faker.company.name();
  return createCompanyDto;
}

export function createCompanyUserDto(): CreateCompanyUserDto {
  const { name: companyName, ...partialCreateCompanyDto } = createTestCompanyDto();
  return {
    ...createTestUserDto(),
    ...partialCreateCompanyDto,
    companyName
  }
}

export function createTestCompany(): Company {
  return {
    id: faker.string.uuid(),
    culture: faker.lorem.paragraph(),
    history: faker.lorem.paragraph(),
    presentation: faker.lorem.paragraph(),
    name: faker.company.name(),
    values: [faker.company.buzzPhrase()]
  };
}

export function createUpdateProfileDto(): UpdateProfileDto {
  const { email, password, ...updateProdileDto } = createTestUserDto();
  return updateProdileDto;
}

export function authenticationMiddleware(payload: TokenPayload) {
  return (req: Request, res: Response, next: NextFunction) => {
    req['user'] = payload;
    next();
  };
}

export function createTestSkillDto(): CreateSkillDto {
  const createSkillDto = new CreateSkillDto();
  createSkillDto.name = faker.person.jobType();
  return createSkillDto;
}

export function createTestSkill() {
  return { ...createTestSkillDto(), id: faker.string.uuid(), authorId: faker.string.uuid() };
}

export function createAuthenticated(): TokenPayload {
  return { email: faker.internet.email(), sub: faker.string.uuid() };
}

export function createTestUpdateSkillsDto(): UpdateSkillsDto {
  return { skillIds: [faker.string.uuid()] };
}