import { Module } from '@nestjs/common';
import { CompanyRepository } from './company.repository';

@Module({
  providers: [CompanyRepository],
  exports: [CompanyRepository]
})
export class CompanyModule {}
