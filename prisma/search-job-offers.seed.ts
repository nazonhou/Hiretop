import { generateDataToTestJobOfferSearching } from "@src/test-search-job-offer";
import { default as prisma } from "@src/testing.prisma.service";

generateDataToTestJobOfferSearching(prisma)
  .then(async (result) => {
    console.log(result);
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })