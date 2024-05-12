import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JobOfferRepository } from './job-offer.repository';
import { TokenPayload } from '@auth/auth.service';

@Injectable()
export class CompanyJobOfferGuard implements CanActivate {
  constructor(private jobOfferRepository: JobOfferRepository) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      const { params, user } = context.switchToHttp().getRequest<{
        params: { jobOfferId: string },
        user?: TokenPayload
      }>();
      if (!user?.company?.id) {
        return false;
      }
      const jobOffer = await this.jobOfferRepository.findOneById(params.jobOfferId);
      return jobOffer.companyId == user.company.id;
    } catch (error) {
      return false;
    }
  }
}
