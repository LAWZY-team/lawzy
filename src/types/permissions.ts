export enum Permission {
  VIEW_DOCUMENTS = 'view_documents',
  EDIT_DOCUMENTS = 'edit_documents',
  DELETE_DOCUMENTS = 'delete_documents',
  CREATE_DOCUMENTS = 'create_documents',
  MANAGE_WORKSPACE = 'manage_workspace',
  MANAGE_MEMBERS = 'manage_members',
  MANAGE_BILLING = 'manage_billing',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_TEMPLATES = 'manage_templates',
}

export enum Role {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    Permission.VIEW_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.DELETE_DOCUMENTS,
    Permission.CREATE_DOCUMENTS,
    Permission.MANAGE_WORKSPACE,
    Permission.MANAGE_MEMBERS,
    Permission.MANAGE_BILLING,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_TEMPLATES,
  ],
  [Role.EDITOR]: [
    Permission.VIEW_DOCUMENTS,
    Permission.EDIT_DOCUMENTS,
    Permission.CREATE_DOCUMENTS,
    Permission.VIEW_ANALYTICS,
  ],
  [Role.VIEWER]: [
    Permission.VIEW_DOCUMENTS,
  ],
}
