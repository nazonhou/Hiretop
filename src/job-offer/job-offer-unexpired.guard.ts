import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JobOfferRepository } from './job-offer.repository';

@Injectable()
export class JobOfferUnexpiredGuard implements CanActivate {
  constructor(private jobOfferRepository: JobOfferRepository) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ params: { jobOfferId?: string } }>();
    if (!request.params.jobOfferId) {
      return false;
    }
    return (await this.jobOfferRepository.findOneUnexpired(request.params.jobOfferId)) !== null;
  }
}
