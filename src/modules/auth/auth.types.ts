export type AuthUserType = 'client' | 'company';

export type ClientAuthUser = {
  type: 'client';
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
};

export type CompanyAuthUser = {
  type: 'company';
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  segment: string;
};

export type AuthUser = ClientAuthUser | CompanyAuthUser;

export type JwtPayload = {
  sub: string;
  email: string;
  type: AuthUserType;
};

export type AuthResult = {
  accessToken: string;
  user: AuthUser;
};

export type GoogleAuthResult = AuthResult;

export type CompanyAuthResult = AuthResult;
