import { useAuthStore } from '@/stores/auth-store'
import { Permission, Role, RolePermissions } from '@/types/permissions'

export function usePermissions() {
  const { user } = useAuthStore()

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !user.roles || user.roles.length === 0) {
      return false
    }

    // Check if any of the user's roles has the required permission
    return user.roles.some((role) => {
      const permissions = RolePermissions[role as Role]
      return permissions?.includes(permission)
    })
  }

  const hasRole = (role: Role): boolean => {
    if (!user || !user.roles) {
      return false
    }
    return user.roles.includes(role)
  }

  const isAdmin = (): boolean => {
    return hasRole(Role.ADMIN)
  }

  const isEditor = (): boolean => {
    return hasRole(Role.EDITOR)
  }

  const isViewer = (): boolean => {
    return hasRole(Role.VIEWER)
  }

  return {
    hasPermission,
    hasRole,
    isAdmin,
    isEditor,
    isViewer,
  }
}
