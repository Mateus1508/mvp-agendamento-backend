import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { formatValidationErrors } from './format-validation-errors';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(formatValidationErrors(errors)),
  });
}
