import { Injectable } from "@nestjs/common";
import { PrismaService } from "@prisma-module/prisma.service";
import { CreateJobOfferDto } from "./create-job-offer.dto";
import { SearchJobOfferDto } from "./search-job-offer.dto";
import { JobOfferDto } from "./job-offer.dto";
import { RawJobOfferDto } from "./raw-job-offer.dto";

@Injectable()
export class JobOfferRepository {
  constructor(private prismaService: PrismaService) {}

  createJobOffer(authorId: string, companyId: string, createJobOfferDto: CreateJobOfferDto) {
    const { skillIds, ...dataToInsert } = createJobOfferDto;
    return this.prismaService.jobOffer.create({
      data: {
        ...dataToInsert,
        postedAt: new Date(),
        author: { connect: { id: authorId } },
        company: { connect: { id: companyId } },
        skills: { connect: skillIds.map(skillId => ({ id: skillId })) }
      }
    })
  }

  async findJobOffersByUserId(
    userId: string, searchJobOfferDto: SearchJobOfferDto
  ): Promise<{ total: number, data: Partial<JobOfferDto>[] }> {
    const { query: matchedSkillsQuery, values, countVariables: totalVariables } = this.getMatchedSkillsQuery(searchJobOfferDto);
    const jobOffersSkillsQuery = this.getJobOffersSkillsQuery();

    let query = 'select matched_skills.*, job_offers_skills.total_skills, ';
    query += 'cast(matched_skills.matched_skills as double precision)/job_offers_skills.total_skills as matching_rate, ';
    query += 'c."name"  as company_name, ';
    query += 'c.category as company_category, ';
    query += '(count(*) over())::integer as total_count ';
    query += 'from ( ';
    query += matchedSkillsQuery;
    query += ') as matched_skills ';
    query += 'join ( ';
    query += jobOffersSkillsQuery;
    query += ') as job_offers_skills ';
    query += 'on matched_skills.id = job_offers_skills.job_offer_id ';
    query += 'join companies c on c.id = matched_skills.company_id ';

    let countVariables = totalVariables;
    countVariables++;
    values.push(new Date().toISOString())
    query += 'where matched_skills.expired_at > $' + countVariables + '::timestamp ';

    if (searchJobOfferDto.companyCategory) {
      const categrories = [searchJobOfferDto.companyCategory].map(category => {
        countVariables++;
        return '$' + countVariables;
      });
      values.push(searchJobOfferDto.companyCategory);
      query += 'and c.category IN (' + categrories.join('::"CompanyCatgory",') + '::"CompanyCategory") ';
    }

    query += 'order by matching_rate desc ';

    countVariables++;
    values.push((searchJobOfferDto.page - 1) * searchJobOfferDto.perPage);
    query += 'offset  $' + countVariables + '::smallint ';

    countVariables++;
    values.push(searchJobOfferDto.perPage);
    query += 'limit  $' + countVariables + '::smallint ';

    const rawJobOffers = await this.prismaService.$queryRawUnsafe<Partial<RawJobOfferDto>[]>(query, userId, ...values);
    return {
      total: rawJobOffers?.[0].total_count ?? 0,
      data: rawJobOffers.map(rawJobOffer => {
        delete rawJobOffer.total_count;
        return rawJobOffer;
      })
    }
  }

  private getMatchedSkillsQuery(searchJobOfferDto: SearchJobOfferDto) {
    let countVariables = 1;
    let query = 'select jo.* , count(us."A")::integer as matched_skills ';
    query += 'from "_JobOfferToSkill" jots ';
    query += 'join job_offers jo on jo.id = jots."A" ';
    query += 'join "_UserSkills" us on jots."B" = us."A" ';
    query += 'where us."B" = $1::uuid ';

    const values = [];

    if (searchJobOfferDto.jobType) {
      countVariables++;
      values.push(searchJobOfferDto.jobType);
      query += 'and jo.type = $' + countVariables + '::"JobType" ';
    }

    if (searchJobOfferDto.locationType) {
      countVariables++;
      values.push(searchJobOfferDto.locationType);
      query += 'and jo.location_type = $' + countVariables + '::"LocationType" ';
    }

    query += 'group by jo.id';

    return { query, values, countVariables };
  }

  private getJobOffersSkillsQuery() {
    let query = 'select jo.id as job_offer_id, count(jots."B")::integer as total_skills ';
    query += 'from "_JobOfferToSkill" jots ';
    query += 'join job_offers jo on jots."A" = jo.id ';
    query += 'group by jo.id ';
    return query;
  }

  findOneUnexpired(jobOfferId: string) {
    return this.prismaService.jobOffer.findUnique({
      where: {
        id: jobOfferId,
        expiredAt: { gt: new Date() }
      }
    })
  }
}
