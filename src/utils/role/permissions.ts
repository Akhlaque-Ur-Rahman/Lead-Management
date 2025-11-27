import {
    PERMISSIONS,
    hasPermission as hasRolePermission,
    canAssignToUser as canRoleAssign,
    RoleKey
} from '../../types/roles';

export { PERMISSIONS };

export function hasPermission(role: string, permission: keyof typeof PERMISSIONS): boolean {
    return hasRolePermission(role as RoleKey, permission);
}

export function canAssignToUser(assignerRole: string, targetUserRole: string): boolean {
    return canRoleAssign(assignerRole as RoleKey, targetUserRole as RoleKey);
}
