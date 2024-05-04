import { CreateTalentDto } from "@user/create-talent.dto";
import { faker } from '@faker-js/faker';
import { User } from "@prisma/client";

export function createTestUserDto(): CreateTalentDto {
  const dto = new CreateTalentDto();
  dto.address = faker.location.streetAddress();
  dto.birthday = faker.date.birthdate();
  dto.email = faker.internet.email();
  dto.name = faker.person.fullName();
  dto.phoneNumber = faker.phone.number();
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
