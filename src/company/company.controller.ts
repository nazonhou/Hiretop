import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateCompanyDto } from './create-company.dto';
import { CompanyService } from './company.service';

@Controller('companies')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  registerCompany(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createCompany(createCompanyDto);
  }
}
