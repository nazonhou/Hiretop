import { TokenPayload } from "@auth/auth.service";

export class FindOneJobApplicationDto {
  jobOfferId: string;
  jobApplicationId: string;
  user: TokenPayload;
}
