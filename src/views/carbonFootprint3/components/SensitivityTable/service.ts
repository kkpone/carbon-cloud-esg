import { request } from '@/api/request';

import { SensitivityItem } from './types';

export function getSensitivityResults(
  accountId: number | string,
  extra: Record<string, unknown> = {},
) {
  return request<{ data: SensitivityItem[] }>({
    method: 'get',
    url: '/footprint3/account/sensitivity/list',
    params: { ...extra, accountId },
  });
}
