import {
  AssignmentAuthority,
  Role,
  ScopeMode,
  SupportLevel,
  UserStatus,
  type Prisma,
} from '@prisma/client';

export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  supportLevel: true,
  scopeMode: true,
  assignmentAuthority: true,
  status: true,
  createdAt: true,
} as const satisfies Prisma.UserSelect;

type UserAccessShape = {
  role: Role;
  supportLevel: SupportLevel | null;
  scopeMode: ScopeMode;
  assignmentAuthority: AssignmentAuthority;
};

export type UserPermissions = {
  canViewClients: boolean;
  canViewProjects: boolean;
  canViewReports: boolean;
  canViewUsersAccess: boolean;
  canManageClients: boolean;
  canManageProjects: boolean;
  canManageUsers: boolean;
  canManageProjectKnowledge: boolean;
  canCreateTickets: boolean;
  canAssignTicketsToSelf: boolean;
  canAssignTicketsToOthers: boolean;
  canEscalateTickets: boolean;
  canMoveTicketsToWaiting: boolean;
  canResolveTickets: boolean;
  canReopenTickets: boolean;
  hasGlobalProjectScope: boolean;
  hasProjectScopedAccess: boolean;
};

export const getDefaultUserAccessProfile = (role: Role, supportLevel?: SupportLevel | null) => {
  if (role === Role.PM) {
    return {
      supportLevel: null,
      scopeMode: ScopeMode.GLOBAL,
      assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS,
    };
  }

  switch (supportLevel) {
    case SupportLevel.SE1:
      return {
        supportLevel: SupportLevel.SE1,
        scopeMode: ScopeMode.GLOBAL,
        assignmentAuthority: AssignmentAuthority.SELF_AND_OTHERS,
      };
    case SupportLevel.SE3:
      return {
        supportLevel: SupportLevel.SE3,
        scopeMode: ScopeMode.PROJECT_SCOPED,
        assignmentAuthority: AssignmentAuthority.SELF_ONLY,
      };
    case SupportLevel.SE2:
    default:
      return {
        supportLevel: SupportLevel.SE2,
        scopeMode: ScopeMode.GLOBAL,
        assignmentAuthority: AssignmentAuthority.SELF_ONLY,
      };
  }
};

export const normalizeUserAccessProfile = (input: {
  role: Role;
  supportLevel?: SupportLevel | null;
  scopeMode?: ScopeMode;
  assignmentAuthority?: AssignmentAuthority;
  status?: UserStatus;
}) => {
  const defaults = getDefaultUserAccessProfile(input.role, input.supportLevel);

  return {
    role: input.role,
    supportLevel: input.role === Role.PM ? null : input.supportLevel ?? defaults.supportLevel,
    scopeMode: input.role === Role.PM ? ScopeMode.GLOBAL : input.scopeMode ?? defaults.scopeMode,
    assignmentAuthority:
      input.role === Role.PM ? AssignmentAuthority.SELF_AND_OTHERS : input.assignmentAuthority ?? defaults.assignmentAuthority,
    status: input.status ?? UserStatus.ACTIVE,
  };
};

export const isPm = (user: UserAccessShape) => user.role === Role.PM;
export const isSupportEngineer = (user: UserAccessShape) => user.role === Role.SE;
export const isSe1 = (user: UserAccessShape) => user.role === Role.SE && user.supportLevel === SupportLevel.SE1;
export const isSe2 = (user: UserAccessShape) => user.role === Role.SE && user.supportLevel === SupportLevel.SE2;
export const isSe3 = (user: UserAccessShape) => user.role === Role.SE && user.supportLevel === SupportLevel.SE3;

export const hasProjectScopedAccess = (user: UserAccessShape) =>
  user.role === Role.SE && user.scopeMode === ScopeMode.PROJECT_SCOPED;

export const canAssignTicketsToOthers = (user: UserAccessShape) =>
  user.role === Role.PM || (user.role === Role.SE && user.assignmentAuthority === AssignmentAuthority.SELF_AND_OTHERS);

export const canManageProjectKnowledge = (user: UserAccessShape) => user.role === Role.PM || isSe3(user);

export const buildUserPermissions = (user: UserAccessShape): UserPermissions => {
  const projectScoped = hasProjectScopedAccess(user);
  const manageAdmin = isPm(user);
  const projectKnowledge = canManageProjectKnowledge(user);

  return {
    canViewClients: true,
    canViewProjects: true,
    canViewReports: true,
    canViewUsersAccess: manageAdmin,
    canManageClients: manageAdmin,
    canManageProjects: manageAdmin,
    canManageUsers: manageAdmin,
    canManageProjectKnowledge: projectKnowledge,
    canCreateTickets: isPm(user) || isSupportEngineer(user),
    canAssignTicketsToSelf: isPm(user) || isSupportEngineer(user),
    canAssignTicketsToOthers: canAssignTicketsToOthers(user),
    canEscalateTickets: isPm(user) || isSupportEngineer(user),
    canMoveTicketsToWaiting: isPm(user) || isSupportEngineer(user),
    canResolveTickets: isPm(user) || isSupportEngineer(user),
    canReopenTickets: isPm(user) || isSupportEngineer(user),
    hasGlobalProjectScope: !projectScoped,
    hasProjectScopedAccess: projectScoped,
  };
};
