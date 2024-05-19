import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from './sign-in.dto';
import { Public } from './public.decorator';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { SignInResponseDto } from './sign-in-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Get a jwt token
   */
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: SignInResponseDto })
  @Post('login')
  signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }
}
