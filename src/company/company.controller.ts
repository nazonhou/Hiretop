import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CreateCompanyDto } from './create-company.dto';
import { CompanyService } from './company.service';
import { FilterCompanyDto } from './filter-company.dto';

@Controller('companies')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  /**
   * Create a company
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  registerCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createCompany(createCompanyDto);
  }

  /**
   * Filter companies by name
   */
  @Get('filters')
  filterCompanies(@Query() filterCompanyDto: FilterCompanyDto) {
    return this.companyService.filterCompaniesByName(filterCompanyDto);
  }
}
