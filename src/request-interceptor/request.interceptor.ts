import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class RequestInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpArgumentsHost = context.switchToHttp();
    const request = httpArgumentsHost.getRequest<Request>();
    request.body['injected'] = {
      params: request.params,
      query: request.query,
      user: request['user'],
      jobApplication: request['jobApplication']
    };
    return next.handle();
  }
}
