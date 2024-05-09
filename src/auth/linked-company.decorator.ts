import { SetMetadata } from '@nestjs/common';

export const IS_COMPANY_USER_KEY = 'is_company_user';
export const LinkedCompany = () => SetMetadata(IS_COMPANY_USER_KEY, true);