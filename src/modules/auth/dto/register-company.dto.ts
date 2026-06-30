import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { COMPANY_SEGMENTS } from '../constants/company-segments';

export class RegisterCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome da empresa' })
  companyName: string;

  @IsString()
  @IsIn([...COMPANY_SEGMENTS], { message: 'Selecione um segmento válido' })
  segment: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o nome' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe o sobrenome' })
  lastName: string;

  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirme a senha' })
  confirmPassword: string;
}
