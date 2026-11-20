import { request } from '@api/request';

export interface FactorUpdateRecord {
  id: string;
  title: string;
  content: string;
  publishTime: string;
  status: number;
  delFlag: number;
}

export interface FactorUpdatesPage {
  list: FactorUpdateRecord[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

interface FactorUpdatesResponse {
  code: number;
  data: FactorUpdatesPage;
  msg: string;
}

export async function getFactorUpdates(
  params: { pageNum: number; pageSize: number },
  signal?: AbortSignal,
): Promise<FactorUpdatesPage> {
  const response = await request<FactorUpdatesResponse>({
    method: 'GET',
    url: '/management/ccdb/update-notices',
    params,
    signal,
  });
  if (response.data.code !== 200) throw new Error(response.data.msg);
  return response.data.data;
}
