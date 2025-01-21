import { ComponentType } from 'react'

export const withRoleProtection = (
  Component: ComponentType,
  allowedRoles: string[],
  requiredPermissions?: string[]
) => {
  const WrappedComponent = (props: any) => <Component {...props} />
  return WrappedComponent
} 