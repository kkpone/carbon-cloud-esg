import Permission from '@/components/Permission';
import type { ReactNode } from 'react';

/** 能碳按钮复用碳云权限组件。 */
export default function AuthButton({
  permissionKey,
  children,
}: {
  permissionKey: string;
  children: ReactNode;
}) {
  return <Permission flag={permissionKey}>{children}</Permission>;
}
