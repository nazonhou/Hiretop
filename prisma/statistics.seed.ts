import { cleanTestDatabase } from "@src/test-utils";
import { TestingStatisticSeed } from "@src/testing-statistic.seed";
import { default as prisma } from "@src/testing.prisma.service";

cleanTestDatabase(prisma)
  .then(async () => {
    const result = await new TestingStatisticSeed(prisma).generateData();
    console.log(result);
    await prisma.$disconnect()
  }).catch(async (e) => {
    console.error(e);
    await prisma.$disconnect()
    process.exit(1)
  });