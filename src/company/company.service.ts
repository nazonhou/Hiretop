import { Injectable } from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { CreateCompanyDto } from './create-company.dto';

@Injectable()
export class CompanyService {
  constructor(private companyRepository: CompanyRepository) {}

  createCompany(createCompanyDto: CreateCompanyDto) {
    return this.companyRepository.create(createCompanyDto);
  }
}
