import { IsNotEmpty } from "class-validator";

export class RejectJobApplicationDto {
  @IsNotEmpty()
  message: string;
}
