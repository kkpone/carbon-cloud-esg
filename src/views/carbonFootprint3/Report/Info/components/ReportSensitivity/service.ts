import { request } from '@/api/request';
import { SensitivityItem } from '@/views/carbonFootprint3/components/SensitivityTable/types';

interface ReportSensitivityItem extends SensitivityItem {
  idMappings: Record<string, string>;
}

/** 列表按行提供旧、新编号对应，页面只恢复当前表单的勾选。 */
interface ReportSensitivityData {
  rows: SensitivityItem[];
  sensitivityScope: string;
}

export async function getReportSensitivityResults(
  accountId: string,
  sensitivityScope: string,
  reportId?: number,
): Promise<ReportSensitivityData> {
  const result = await request<{ data: ReportSensitivityItem[] }>({
    method: 'get',
    url: '/footprint3/report/sensitivity/list',
    params: { reportId, accountId },
  });
  const rows = result.data.data;
  if (sensitivityScope === '0' || sensitivityScope === '') {
    return { rows, sensitivityScope };
  }
  const mappings: Record<string, string> = {};
  rows.forEach(row => Object.assign(mappings, row.idMappings));
  // 后端明确删除的编号对应空串；未明确删除的隐藏选择仍保留。
  const selected = sensitivityScope
    .split(',')
    .flatMap(id => (mappings[id] ?? id).split(','))
    .filter(Boolean);
  return { rows, sensitivityScope: Array.from(new Set(selected)).join(',') };
}
