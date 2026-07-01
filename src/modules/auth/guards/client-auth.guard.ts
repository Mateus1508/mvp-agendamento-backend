import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ClientAuthUser } from '../auth.types';

type RequestWithClientUser = {
  user?: ClientAuthUser;
};

@Injectable()
export class ClientAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithClientUser>();

    if (request.user?.type !== 'client') {
      throw new ForbiddenException(
        'Apenas clientes podem acessar este recurso',
      );
    }

    return true;
  }
}
