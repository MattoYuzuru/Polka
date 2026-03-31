export interface UserIdentity {
  id: string;
  nickname: string;
  email: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: UserIdentity;
}

export interface LoginPayload {
  email: string;
  password: string;
}
