import { Injectable } from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { CreateCompanyDto } from './create-company.dto';
import { FilterCompanyDto } from './filter-company.dto';

@Injectable()
export class CompanyService {
  constructor(private companyRepository: CompanyRepository) {}

  createCompany(createCompanyDto: CreateCompanyDto) {
    return this.companyRepository.create(createCompanyDto);
  }

  filterCompaniesByName({ name, ...paginationDto }: FilterCompanyDto) {
    return this.companyRepository.findByNameStartsWith(name, paginationDto);
  }
}
