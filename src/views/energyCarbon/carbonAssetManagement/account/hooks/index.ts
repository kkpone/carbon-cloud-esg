import { useQuery } from '@tanstack/react-query';

import { getCarbonAccountOverviewApi } from '../services';

/** 碳账户概览 Query Key。 */
export const carbonAccountQueryKeys = {
  all: ['carbon-account'] as const,
  overview: (orgId: number | undefined) =>
    [...carbonAccountQueryKeys.all, 'overview', orgId] as const,
};

/** 查询所选组织的账户概览，未选组织时不发送请求。 */
export function useCarbonAccountOverview(orgId: number | undefined) {
  return useQuery({
    queryKey: carbonAccountQueryKeys.overview(orgId),
    queryFn: () =>
      getCarbonAccountOverviewApi(orgId as number).then(
        response => response.data.data,
      ),
    enabled: orgId !== undefined,
  });
}
