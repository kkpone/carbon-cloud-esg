import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type { CarbonAccountOverview } from './types';

/**
 * @description 业务检索：碳账户概览 - 查询所选组织及全部可见下级组织的资产余量
 */
export const getCarbonAccountOverviewApi = (orgId: number) =>
  request<ResponseData<CarbonAccountOverview>>({
    method: 'GET',
    url: '/energy/carbonAccount/overview',
    params: { orgId },
  });
