import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import {
  getEnergyFlowSettingDetailApi,
  saveEnergyFlowSettingApi,
} from '../services';
import type { EnergyFlowSettingSaveReq } from '../types';

/** 能流设置 Query Key。 */
export const energyFlowSettingQueryKeys = {
  all: ['energy-flow-setting'] as const,
  detail: (orgId: number) =>
    [...energyFlowSettingQueryKeys.all, 'detail', orgId] as const,
};

/** 按组织查询能流设置；未选组织时不发送请求。 */
export function useEnergyFlowSettingDetail(
  orgId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: energyFlowSettingQueryKeys.detail(orgId ?? 0),
    queryFn: () =>
      getEnergyFlowSettingDetailApi(orgId as number).then(r => r.data.data),
    enabled: enabled && orgId !== undefined,
  });
}

/** 保存当前组织能流设置，成功后刷新该组织详情缓存。 */
export function useSaveEnergyFlowSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnergyFlowSettingSaveReq) =>
      saveEnergyFlowSettingApi(data).then(r => r.data.data),
    onSuccess: (_data, variables) => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({
        queryKey: energyFlowSettingQueryKeys.detail(variables.orgId),
        exact: true,
      });
    },
  });
}
