import 'dotenv/config'
import { PrismaClient, Role } from '@prisma/client'
import { faker } from '@faker-js/faker';
const prisma = new PrismaClient();
import * as bcrypt from 'bcrypt';
const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS);
async function main() {
  const talent = await prisma.user.upsert({
    where: { email: 'talent@hiretop.io' },
    update: {},
    create: {
      name: faker.person.fullName(),
      address: faker.location.streetAddress(),
      birthday: faker.date.birthdate(),
      phoneNumber: faker.phone.number(),
      email: 'talent@hiretop.io',
      password: await bcrypt.hash("password", saltRounds),
    },
  })
  console.log({ talent })
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })