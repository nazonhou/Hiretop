import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CreateCompanyDto } from './create-company.dto';
import { CompanyService } from './company.service';
import { PaginationDto } from '@src/pagination.dto';
import { FilterCompanyDto } from './filter-company.dto';

@Controller('companies')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  registerCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createCompany(createCompanyDto);
  }

  @Get('filters')
  filterCompanies(@Query() filterCompanyDto: FilterCompanyDto) {
    return this.companyService.filterCompaniesByName(filterCompanyDto);
  }
}
