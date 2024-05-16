import { Test } from '@nestjs/testing';
import { JobApplicationRepository } from './job-application.repository';
import { PrismaService } from '@prisma-module/prisma.service';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import * as util from "util";
import { exec } from "child_process";
import { cleanTestDatabase, createTestRejectJobApplicationDto, createTestingPrismaClient } from '@src/test-utils';
import { generateDataToTestJobOfferSearching } from '@src/test-search-job-offer';
import { JobApplicationStatus, PrismaClient } from '@prisma/client';
import { TestingSearchJobApplication } from '@src/testing-search-job-application';
import { faker } from '@faker-js/faker';
import { AcceptJobApplicationDto } from './accept-job-application.dto';

describe('JobApplicationRepository', () => {
  let jobApplicationRepository: JobApplicationRepository;
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
      providers: [JobApplicationRepository, PrismaService],
    })
      .overrideProvider(PrismaService)
      .useValue(TestingPrismaService)
      .compile();

    jobApplicationRepository = moduleRef.get<JobApplicationRepository>(JobApplicationRepository);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestingPrismaService.$disconnect();
    await container.stop();
  });

  beforeEach(async () => {
    await cleanTestDatabase(TestingPrismaService);
  });

  describe('createJobApplication', () => {
    it('Should insert a new jobApplication into the database', async () => {
      const data = await generateDataToTestJobOfferSearching(prismaService);
      const result = await jobApplicationRepository.createJobApplication({
        applicantId: data.talent.id,
        jobOfferId: data.jobOffer1.id
      });
      const jobApplication = await prismaService.jobApplication.findUnique({
        where: { id: result.id }
      });
      expect(jobApplication).not.toBeNull();
      expect(jobApplication.appliedAt).not.toBeNull();
      expect(jobApplication.status).toBe(JobApplicationStatus.TO_ASSESS);
      expect(jobApplication.applicantId).toBe(data.talent.id);
      expect(jobApplication.jobOfferId).toBe(data.jobOffer1.id);
    });
  });

  describe('findApplicationsByJobOfferId', () => {
    it('Should find jobApplication1 and jobApplication2 when jobOffer is jobOffer1', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const result = await jobApplicationRepository.findApplicationsByJobOfferId(
        data.jobOffer1.id, { page: 1, perPage: 2 }
      );
      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].jobApplicationId).toBe(data.jobApplication1.id);
      expect(result.data[0].id).toBe(data.talent1.id);
      expect(result.data[0].matchedSkills).toBe(2);
      expect(result.data[1].jobApplicationId).toBe(data.jobApplication2.id);
      expect(result.data[1].id).toBe(data.talent2.id);
      expect(result.data[1].matchedSkills).toBe(1);
    });
    it('Should find jobApplication2 when jobOffer is jobOffer1, page is 2 and perPage is 1', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const result = await jobApplicationRepository.findApplicationsByJobOfferId(
        data.jobOffer1.id, { page: 2, perPage: 1 }
      );
      expect(result.total).toBe(2);
      expect(result.data.length).toBe(1);
      expect(result.data[0].jobApplicationId).toBe(data.jobApplication2.id);
      expect(result.data[0].id).toBe(data.talent2.id);
      expect(result.data[0].matchedSkills).toBe(1);
    });
    it('Should find jobApplication3 when jobOffer is jobOffer2', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const result = await jobApplicationRepository.findApplicationsByJobOfferId(
        data.jobOffer2.id, { page: 1, perPage: 2 }
      );
      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.data[0].jobApplicationId).toBe(data.jobApplication3.id);
      expect(result.data[0].id).toBe(data.talent3.id);
      expect(result.data[0].matchedSkills).toBe(1);
    });
    it('Should not find any application when jobOffer is jobOffer3', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const result = await jobApplicationRepository.findApplicationsByJobOfferId(
        data.jobOffer3.id, { page: 1, perPage: 2 }
      );
      expect(result.total).toBe(0);
      expect(result.data.length).toBe(0);
    });
  });

  describe('findOneJobApplication', () => {
    it('Should throw an exception when jobApplicationId is not a uuid', async () => {
      const result = jobApplicationRepository.findOneJobApplication(faker.lorem.word());
      expect(result).rejects.toThrow();
    });
    it('Should not retrieve a jobApplication when id does not exists', async () => {
      const result = await jobApplicationRepository.findOneJobApplication(faker.string.uuid());
      expect(result).toBeNull();
    });
    it('Should retrieve a jobApplication', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const result = await jobApplicationRepository.findOneJobApplication(data.jobApplication1.id);
      expect(result).not.toBeNull();
      expect(result.applicant).toMatchObject(data.talent1);
      expect(result.applicant.skills.length).toBe(2);
      expect(result.applicant.skills.every(({ id }) => id == data.skill1.id || id == data.skill2.id)).toBeTruthy();
      expect(result.applicant.workExperiences.length).toBe(1);
      expect(result.applicant.workExperiences[0]).toMatchObject(data.workExperience1);
      expect(result.jobOffer).toMatchObject(data.jobOffer1);
      expect(result.jobOffer.skills.length).toBe(2);
      expect(result.jobOffer.skills.every(({ id }) => id == data.skill1.id || id == data.skill2.id)).toBeTruthy();
    });
  });

  describe('rejectJobApplication', () => {
    it('Should update jobApplication status to REJECTED and create a applicationFeedback', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const rejectJobApplicationDto = createTestRejectJobApplicationDto();
      await jobApplicationRepository.rejectJobApplication(data.jobApplication1.id, rejectJobApplicationDto);
      const result = await prismaService.jobApplication.findUnique({
        where: { id: data.jobApplication1.id },
        include: { applicationFeedback: true }
      });
      expect(result.status).toBe(JobApplicationStatus.REJECTED);
      expect(result.applicationFeedback).not.toBeNull();
      expect(result.applicationFeedback.message).toBe(rejectJobApplicationDto.message);
    });
    it('Should throw an exception when jobApplicationId does not reference a jobApplication', async () => {
      const rejectJobApplicationDto = createTestRejectJobApplicationDto();
      const result = jobApplicationRepository.rejectJobApplication(faker.string.uuid(), rejectJobApplicationDto);
      expect(result).rejects.toThrow();
    });
    it('Should throw an exception when jobApplicationId is not a valid uuid', async () => {
      const rejectJobApplicationDto = createTestRejectJobApplicationDto();
      const result = jobApplicationRepository.rejectJobApplication(faker.string.alphanumeric(), rejectJobApplicationDto);
      expect(result).rejects.toThrow();
    });
  });

  describe('acceptJobApplication', () => {
    it('Should throw an exception when jobApplicationId is not a valid uuid', async () => {
      const acceptJobApplicationDto: AcceptJobApplicationDto = {
        endedAt: faker.date.anytime(),
        startedAt: faker.date.anytime(),
        message: faker.lorem.paragraph()
      };
      const result = jobApplicationRepository.acceptJobApplication(faker.lorem.word(), acceptJobApplicationDto);
      expect(result).rejects.toThrow();
    });
    it('Should throw an exception when jobApplicationId does not a reference a jobApplication', async () => {
      const acceptJobApplicationDto: AcceptJobApplicationDto = {
        endedAt: faker.date.anytime(),
        startedAt: faker.date.anytime(),
        message: faker.lorem.paragraph()
      };
      const result = jobApplicationRepository.acceptJobApplication(faker.string.uuid(), acceptJobApplicationDto);
      expect(result).rejects.toThrow();
    });
    it('Should update jobApplication status, create jobInterview and applicationFeedback', async () => {
      const data = await new TestingSearchJobApplication(prismaService).generateData();
      const startedAt = faker.date.soon();
      const endedAt = faker.date.soon({ refDate: startedAt });
      const acceptJobApplicationDto: AcceptJobApplicationDto = {
        startedAt,
        endedAt,
        message: faker.lorem.paragraph()
      };
      const result = await jobApplicationRepository.acceptJobApplication(data.jobApplication1.id, acceptJobApplicationDto);
      expect(result.status).toBe(JobApplicationStatus.ACCEPTED);
      expect(result.applicationFeedback).not.toBeNull();
      expect(result.applicationFeedback.message).toBe(acceptJobApplicationDto.message);
      expect(result.jobInterview).not.toBeNull();
      expect(result.jobInterview.startedAt).toMatchObject(startedAt);
      expect(result.jobInterview.endedAt).toMatchObject(endedAt);
    });
  });
});
