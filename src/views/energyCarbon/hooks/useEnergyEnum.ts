import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import { useQuery } from '@tanstack/react-query';

/** 能碳类型、阶段从本服务枚举查询，语言切换使用独立查询键。 */
export function useEnergyEnum(
  enumName: 'energyConsumptionDataType' | 'energyFlowStage',
) {
  const { locale } = useLocale();
  return useQuery({
    queryKey: ['energy-carbon-enum', enumName, locale],
    queryFn: () =>
      request<ResponseData<Array<{ code: number | string; name: string }>>>({
        method: 'GET',
        url: `/energy/enums/${enumName}`,
      }).then(response => response.data.data),
  });
}
