import React, { ComponentType } from 'react'

export const withRoleProtection = <P extends object>(
  Component: ComponentType<P>,
  allowedRoles: string[],
  requiredPermissions?: string[]
) => {
  const WrappedComponent = (props: P) => <Component {...props} />
  return WrappedComponent
} 