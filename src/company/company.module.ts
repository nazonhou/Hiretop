import { Module } from '@nestjs/common';
import { CompanyRepository } from './company.repository';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  providers: [CompanyRepository, CompanyService],
  exports: [CompanyRepository],
  controllers: [CompanyController]
})
export class CompanyModule {}
