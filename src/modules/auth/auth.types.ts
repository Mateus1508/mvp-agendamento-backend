export type AuthUser = {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture: string | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
};

export type GoogleAuthResult = {
  accessToken: string;
  user: AuthUser;
};
