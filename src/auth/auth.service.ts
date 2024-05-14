import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { UserService } from '@user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async signIn(
    email: string,
    pass: string
  ): Promise<{
    access_token: string,
    payload: TokenPayload
  }> {
    const presumedUser = await this.userService.findByEmail(email);
    if (!presumedUser || !await bcrypt.compare(pass, presumedUser.password)) {
      throw new UnauthorizedException();
    }

    const user = await this.userService.findOneById(presumedUser.id);
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.rolesUser.map(roleUser => roleUser.role),
      name: user.name
    };
    if (user.companyUser) {
      payload.company = {
        id: user.companyUser.companyId,
        name: user.companyUser.company.name
      }
    }

    return {
      access_token: await this.jwtService.signAsync(payload),
      payload
    };
  }
}

export interface TokenPayload {
  sub: string;
  email: string;
  roles: Role[],
  company?: { id: string, name: string },
  name: string
}  
