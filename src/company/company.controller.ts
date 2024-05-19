import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CreateCompanyDto } from './create-company.dto';
import { CompanyService } from './company.service';
import { FilterCompanyDto } from './filter-company.dto';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CompanyEntity } from './company.entity';

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  /**
   * Create a company
   */
  @Post()
  @ApiCreatedResponse({ type: CompanyEntity })
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
