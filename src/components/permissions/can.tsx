import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { Permission } from '@/types/permissions'

interface CanProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { hasPermission } = usePermissions()

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
