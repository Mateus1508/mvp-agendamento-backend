import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginCompanyDto {
  @IsEmail({}, { message: 'Informe um e-mail válido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Informe a senha' })
  @MinLength(1)
  password: string;
}
