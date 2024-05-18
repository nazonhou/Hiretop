import { PrismaService } from '@prisma-module/prisma.service';
import { JobOfferRepository } from './job-offer.repository';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { Test } from '@nestjs/testing';
import { cleanTestDatabase, createTestCompanyDto, createTestJobOfferData, createTestJobOfferDto, createTestSkillDto, createTestUserDto, createTestWorkExperienceDto, createTestingPrismaClient } from '@src/test-utils';
import { generateDataToTestJobOfferSearching } from '@src/test-search-job-offer';
import { SearchJobOfferDto } from './search-job-offer.dto';
import { faker } from '@faker-js/faker';
import { PrismaClient } from '@prisma/client';
import { TestingStatisticSeed } from '@src/testing-statistic.seed';
import { GetJobOfferStatisticsDto } from './get-job-offer-statistics.dto';

describe('JobOfferRepository', () => {
  let jobOfferRepository: JobOfferRepository;
  let prismaService: PrismaService;
  let container: StartedPostgreSqlContainer;
  let TestingPrismaService: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer(process.env.TESTING_DATABASE_IMAGE).start();

    await util.promisify(exec)(`npx prisma db push`, {
      env: { DATABASE_URL: container.getConnectionUri() }
    });

    TestingPrismaService = createTestingPrismaClient(container.getConnectionUri());
    await TestingPrismaService.$connect();

    const moduleRef = await Test.createTestingModule({
      providers: [JobOfferRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    jobOfferRepository = moduleRef.get<JobOfferRepository>(JobOfferRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  describe('createJobOffer', () => {
    it('Should insert a new jobOffer into the database', async () => {
      const [user, company] = await Promise.all([
        prismaService.user.create({ data: createTestUserDto() }),
        prismaService.company.create({ data: createTestCompanyDto() }),
      ]);
      const skill = await prismaService.skill.create({ data: { ...createTestSkillDto(), authorId: user.id } });
      const result = await jobOfferRepository.createJobOffer(
        user.id,
        company.id,
        createTestJobOfferDto([skill.id])
      );

      const jobOffer = await prismaService.jobOffer.findUnique({ where: { id: result.id } });
      expect(jobOffer).not.toBeNull();
      expect(jobOffer).toMatchObject(result);
      expect(jobOffer.authorId).toBe(user.id);
      expect(jobOffer.companyId).toBe(company.id);
    });
  });

  describe('findJobOffersByUserId', () => {
    const searchJobOfferDto: SearchJobOfferDto = { page: 1, perPage: 3 };
    it('Should retrieve 2 jobOffers when using any filter', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        searchJobOfferDto
      );
      expect(result.data.length).toBe(2);
      expect(result.data[0].id).toBe(searchJobOfferSeedData.jobOffer1.id);
      expect(result.data[1].id).toBe(searchJobOfferSeedData.jobOffer2.id);
      expect(result.total).toBe(2);
    });
    it('Should retrieve at least one jobOffer when filtered by jobType', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const jobType = searchJobOfferSeedData.jobOffer1.type;
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { jobType, ...searchJobOfferDto }
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.every((jobOfferDto) => jobOfferDto.type == jobType)).toBeTruthy();
      expect(result.total).toBe(result.data.length);
    });
    it('Should retrieve at least one jobOffer when filtered by LocationType', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const locationType = searchJobOfferSeedData.jobOffer1.locationType;
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { locationType, ...searchJobOfferDto }
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);
      expect(result.data.every((jobOfferDto) => jobOfferDto.location_type == locationType)).toBeTruthy();
      expect(result.total).toBe(result.data.length);
    });
    it('Should retrieve at least one jobOffer when filtered by CompanyCategory', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const companyCategory = searchJobOfferSeedData.company.category;
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { companyCategory, ...searchJobOfferDto }
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);

      expect(result.data.every((jobOfferDto) => jobOfferDto.company_category == companyCategory)).toBeTruthy();
      expect(result.total).toBe(2);
    });
    it('Should retrieve at least one jobOffer when using all filters', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const companyCategory = searchJobOfferSeedData.company.category;
      const locationType = searchJobOfferSeedData.jobOffer1.locationType;
      const jobType = searchJobOfferSeedData.jobOffer1.type;
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { jobType, locationType, companyCategory, ...searchJobOfferDto }
      );
      expect(result.data.length).toBeGreaterThanOrEqual(1);

      expect(result.data.every(
        (jobOfferDto) => jobOfferDto.company_category == companyCategory
          && jobOfferDto.location_type == locationType
          && jobOfferDto.type == jobType
      )).toBeTruthy();
      expect(result.total).toBe(result.data.length);
    });
    it('Should retrieve only one jobOffer when using all filters and perPage is equal 1', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      const companyCategory = searchJobOfferSeedData.company.category;
      const locationType = searchJobOfferSeedData.jobOffer1.locationType;
      const jobType = searchJobOfferSeedData.jobOffer1.type;
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { jobType, locationType, companyCategory, perPage: 1, page: 1 }
      );
      expect(result.data.length).toBe(1);

      expect(result.data.every(
        (jobOfferDto) => jobOfferDto.company_category == companyCategory
          && jobOfferDto.location_type == locationType
          && jobOfferDto.type == jobType
      )).toBeTruthy()
    });
    it('Should not retrieve any jobOffer when only jobOffer3 is posted', async () => {
      const searchJobOfferSeedData = await generateDataToTestJobOfferSearching(prismaService);
      await prismaService.jobOffer.deleteMany({
        where: {
          id: {
            in: [
              searchJobOfferSeedData.jobOffer1.id,
              searchJobOfferSeedData.jobOffer2.id,
            ]
          }
        }
      });
      const result = await jobOfferRepository.findJobOffersByUserId(
        searchJobOfferSeedData.talent.id,
        { perPage: 1, page: 1 }
      );
      expect(result.total).toBe(0);
      expect(result.data.length).toBe(0);
    });
  });

  describe('findOneUnexpired', () => {
    it('Should find one when it exists and its not expired', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const jobOffer = await prismaService.jobOffer.create({
        data: createTestJobOfferData({ userId: user.id })
      });
      const result = await jobOfferRepository.findOneUnexpired(jobOffer.id);
      expect(result).not.toBeNull();
      expect(result).toMatchObject(jobOffer);
    });
    it('Should not find anything when it exists but its expired', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const jobOffer = await prismaService.jobOffer.create({
        data: { ...createTestJobOfferData({ userId: user.id }), expiredAt: faker.date.recent() }
      });
      const result = await jobOfferRepository.findOneUnexpired(jobOffer.id);
      expect(result).toBeNull();
    });
    it('Should not find anything when it does not exists', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const jobOffer = await prismaService.jobOffer.create({
        data: createTestJobOfferData({ userId: user.id })
      });
      const result = await jobOfferRepository.findOneUnexpired(faker.string.uuid());
      expect(result).toBeNull();
    });
  });
  describe('findOneById', () => {
    it('Should find a jobOffer when it exists', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const jobOffer = await prismaService.jobOffer.create({
        data: createTestJobOfferData({ userId: user.id })
      });
      const result = await jobOfferRepository.findOneById(jobOffer.id);
      expect(result).not.toBeNull();
      expect(result).toMatchObject(jobOffer);
    });
    it('Should not find a jobOffer when it does not exists', async () => {
      const user = await prismaService.user.create({ data: createTestUserDto() });
      const jobOffer = await prismaService.jobOffer.create({
        data: createTestJobOfferData({ userId: user.id })
      });
      const result = await jobOfferRepository.findOneById(faker.string.uuid());
      expect(result).toBeNull();
    });
    it('Should throw an exception when jobOfferId is not a valid uuid', async () => {
      expect(jobOfferRepository.findOneById(faker.string.alphanumeric()))
        .rejects
        .toThrow();
    });
  });

  describe('getJobOffersStatistics', () => {
    it('Should return jobOffer1 statistics', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: new Date(data.jobOffer1.postedAt.getTime() - 1000),
        end: new Date(data.jobOffer1.postedAt.getTime() + 1000),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.length).toBe(2);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total == 1)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total == 1)).toBeDefined();
      expect(result.find(({ status }) => status == 'TO_ASSESS')).toBeUndefined();
    });
    it('Should return jobOffer2 statistics', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: new Date(data.jobOffer2.postedAt.getTime() - 1000),
        end: new Date(data.jobOffer2.postedAt.getTime() + 1000),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.length).toBe(2);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total == 1)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total == 1)).toBeDefined();
      expect(result.find(({ status }) => status == 'TO_ASSESS')).toBeUndefined();
    });
    it('Should return jobOffer3 statistics', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: new Date(data.jobOffer3.postedAt.getTime() - 1000),
        end: new Date(data.jobOffer3.postedAt.getTime() + 1000),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.length).toBe(1);
      expect(result.find(({ status }) => status == 'ACCEPTED')).toBeUndefined();
      expect(result.find(({ status }) => status == 'REJECTED')).toBeUndefined();
      expect(result.find(({ status, total }) => status == 'TO_ASSESS' && total == 2)).toBeDefined();
    });
    it('Should return all jobOffers statistics', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: faker.date.past(),
        end: faker.date.future(),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.length).toBe(3);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total == 2)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total == 2)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'TO_ASSESS' && total == 2)).toBeDefined();
    });
    it('Should return 0 jobOffer statistics', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const start = faker.date.past();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start,
        end: new Date(start.getTime() + 1000),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.length).toBe(0);
    });
    it('Should return statistics with jobType filter', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: faker.date.past(),
        end: faker.date.future(),
        jobType: data.jobOffer1.type
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total >= 1)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total >= 1)).toBeDefined();
    });
    it('Should return statistics with locationType filter', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: faker.date.past(),
        end: faker.date.future(),
        locationType: data.jobOffer1.locationType
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total >= 1)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total >= 1)).toBeDefined();
    });
    it('Should return statistics with all filters', async () => {
      const data = await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: faker.date.past(),
        end: faker.date.future(),
        jobType: data.jobOffer1.type,
        locationType: data.jobOffer1.locationType
      }
      const result = await jobOfferRepository.getJobOffersStatistics(data.company.id, getJobOfferStatisticsDto);
      expect(result.find(({ status, total }) => status == 'ACCEPTED' && total >= 1)).toBeDefined();
      expect(result.find(({ status, total }) => status == 'REJECTED' && total >= 1)).toBeDefined();
    });
    it('Should return 0 jobOffer statistics when companyId is not the same', async () => {
      await new TestingStatisticSeed(prismaService).generateData();
      const getJobOfferStatisticsDto: GetJobOfferStatisticsDto = {
        start: faker.date.past(),
        end: faker.date.future(),
      }
      const result = await jobOfferRepository.getJobOffersStatistics(faker.string.uuid(), getJobOfferStatisticsDto);
      expect(result.length).toBe(0);
    });
  });
});
