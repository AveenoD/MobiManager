export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewReports: boolean;
}

export interface Actor {
  type: 'ADMIN' | 'SUB_ADMIN';
  adminId: string;
  subAdminId?: string;
  shopId: string | null;
  permissions: Permissions;
  name?: string;
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export function checkPermission(
  actor: Actor,
  action: 'create' | 'edit' | 'delete' | 'viewReports'
): boolean {
  if (actor.type === 'ADMIN') return true;

  const permMap: Record<string, boolean> = {
    create: actor.permissions.canCreate,
    edit: actor.permissions.canEdit,
    delete: actor.permissions.canDelete,
    viewReports: actor.permissions.canViewReports,
  };

  return permMap[action] ?? false;
}

export function requirePermission(
  actor: Actor,
  action: 'create' | 'edit' | 'delete' | 'viewReports'
): void {
  if (!checkPermission(actor, action)) {
    throw new PermissionError(
      `You don't have permission to ${action} records`
    );
  }
}

export function getShopFilter(actor: Actor): { shopId?: string } {
  if (actor.shopId) {
    return { shopId: actor.shopId };
  }
  return {};
}
