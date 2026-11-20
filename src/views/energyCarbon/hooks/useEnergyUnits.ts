import { request } from '@/api/request';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ResponseData } from '../platform/types';

interface UnitOption {
  value: string;
  label: string;
  groupValue: string;
  groupLabel: string;
}
/** 单位值使用碳云 factorUnitM，级联选中只提交末级 value。 */
export function useUnitList(enabled = true) {
  const query = useQuery({
    queryKey: ['energy-carbon', 'units'],
    enabled,
    queryFn: async () =>
      (
        await request<ResponseData<UnitOption[]>>({
          method: 'GET',
          url: '/energy/platform/units',
        })
      ).data.data || [],
  });
  const cascaderOptions = useMemo(() => {
    const groups = new Map<
      string,
      {
        value: string;
        label: string;
        children: { value: string; label: string }[];
      }
    >();
    (query.data || []).forEach(unit => {
      if (!groups.has(unit.groupValue))
        groups.set(unit.groupValue, {
          value: unit.groupValue,
          label: unit.groupLabel,
          children: [],
        });
      groups
        .get(unit.groupValue)
        ?.children.push({ value: unit.value, label: unit.label });
    });
    return [...groups.values()];
  }, [query.data]);
  return { ...query, groups: cascaderOptions, cascaderOptions };
}
