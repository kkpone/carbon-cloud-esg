import type { RootState } from '@/store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo } from 'react';

import { useSelector } from 'react-redux';

/** 能碳缓存随企业/用户及页面生命周期隔离，避免切换企业后复用前一身份数据。 */
export default function EnergyQueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  const user = useSelector(
    (state: RootState) => state.companyUserInfo.userInfo,
  );
  const client = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
    [user?.companyId, user?.userId],
  );
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
