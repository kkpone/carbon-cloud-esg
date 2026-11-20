/*
 * @Author: 张明尧
 * @Date: 2022-07-13 14:23:39
 */
import store from '@src/store';

/** 兼容 esg2 与 esg 同义权限前缀 */
export const hasPermissionFlag = (
  permissions: string[] | undefined,
  flag?: string,
) => {
  if (!flag || !permissions?.length) return false;
  const normalizedFlag = flag.trim();
  if (permissions.includes(normalizedFlag)) return true;
  if (normalizedFlag.startsWith('esg:')) {
    return permissions.includes(normalizedFlag.replace(/^esg:/, 'esg2:'));
  }
  if (normalizedFlag.startsWith('/esg/')) {
    return permissions.includes(normalizedFlag.replace(/^\/esg\//, '/esg2/'));
  }
  return false;
};

/** 检查是否有权限 */
export const checkPermissions = <T>(data: T, flag: string) => {
  const permissions = store.getState().companyUserInfo?.userInfo?.permissions;

  if (hasPermissionFlag(permissions, flag)) return data;
  return null;
};
