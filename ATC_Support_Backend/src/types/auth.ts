import type { AssignmentAuthority, Role, ScopeMode, SupportLevel, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  supportLevel: SupportLevel | null;
  scopeMode: ScopeMode;
  assignmentAuthority: AssignmentAuthority;
  status: UserStatus;
};
