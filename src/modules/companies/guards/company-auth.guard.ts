import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CompanyAuthUser } from '../../auth/auth.types';

type RequestWithCompanyUser = {
  user?: CompanyAuthUser;
};

@Injectable()
export class CompanyAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithCompanyUser>();

    if (request.user?.type !== 'company') {
      throw new ForbiddenException(
        'Apenas usuários de empresa podem acessar este recurso',
      );
    }

    return true;
  }
}
