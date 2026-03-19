import type { Role, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
};
