import { Public } from '@auth/public.decorator';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateCompanyUserDto } from './create-company-user.dto';
import { UserService } from './user.service';

@Controller('company-users')
export class CompanyUserController {
  constructor(private userService: UserService) {}

  /**
   * Self-registration as company member
   */
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  register(@Body() createCompanyUserDto: CreateCompanyUserDto) {
    return this.userService.createCompanyUser(createCompanyUserDto);
  }
}
