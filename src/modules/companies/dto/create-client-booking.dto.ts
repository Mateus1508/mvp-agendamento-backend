import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { validationMessages } from '../../../common/validation/validation-messages';

export class CreateClientBookingDto {
  @IsString({ message: validationMessages.string('A data') })
  @IsNotEmpty({ message: 'Informe a data do agendamento' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe uma data válida',
  })
  date: string;

  @IsString({ message: validationMessages.string('O horário') })
  @IsNotEmpty({ message: 'Informe o horário do agendamento' })
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Informe um horário válido',
  })
  time: string;

  @IsOptional()
  @IsString({ message: validationMessages.string('O serviço') })
  serviceId?: string;
}
