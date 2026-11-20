import { request } from '@src/api/request';

import type { OrgPeriod } from '../../AccountingList/type';

export const getReportPeriodList = (params: { cYear: string }) =>
  request<{ data: Pick<OrgPeriod, 'name' | 'value'>[] }>({
    method: 'GET',
    url: '/enterprise/computation/task/periodList',
    params,
  });
