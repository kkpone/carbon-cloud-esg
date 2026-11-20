import type { RootState } from '@/store';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

/** 直接读取碳云 Redux 角色权限，不建立独立权限 Store。 */
export function useMenuStore<T>(
  select: (state: { permissionKeys: Set<string> }) => T,
): T {
  const values = useSelector(
    (state: RootState) => state.companyUserInfo.userInfo?.permissions,
  );
  const permissionKeys = useMemo(() => new Set(values || []), [values]);
  return select({ permissionKeys });
}
