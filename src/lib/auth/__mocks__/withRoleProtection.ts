import { NextPage } from 'next';
import { Permission } from '@/types/auth';

export const withRoleProtection = (
  Component: NextPage,
  requiredPermissions?: Permission[]
) => {
  return Component;
}; 