import { $Enums, Role } from "@prisma/client";
import { TokenPayload } from "./auth.service";
import { ApiProperty } from "@nestjs/swagger";

export class SignInResponseDto {
  access_token: string;
  payload: Payload;
}

class Payload implements TokenPayload {
  company?: { id: string; name: string; };
  email: string;
  name: string;
  @ApiProperty({ enum: Role, isArray: true })
  roles: $Enums.Role[];
  sub: string;
}
