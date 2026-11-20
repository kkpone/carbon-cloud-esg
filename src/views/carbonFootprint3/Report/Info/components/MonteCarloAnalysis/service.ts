import { request } from '@/api/request';
import {
  MonteCarloParameter,
  MonteCarloParameterResult,
  MonteCarloPreview,
  MonteCarloRequest,
  MonteCarloResult,
  MonteCarloTask,
} from './types';

const prefix = '/footprint3/report/monteCarlo';

/** 提交数值及其单位上下文，不回传其他展示信息、计算结果或状态。 */
export function monteCarloRequest(data: MonteCarloRequest): MonteCarloRequest {
  const quality = (rows: MonteCarloRequest['reportActivityList']) =>
    rows?.map(({ dataType, uncertain }) => ({ dataType, uncertain }));
  return {
    accountId: data.accountId,
    reportId: data.reportId,
    calculationId: data.calculationId,
    config: data.config && {
      iterations: data.config.iterations,
      parameters: data.config.parameters.map(
        ({
          id,
          unit,
          mean,
          uncertainty,
          distribution,
          uncertaintySource,
          configuration,
          note,
        }) => ({
          id,
          unit,
          mean,
          uncertainty,
          distribution,
          uncertaintySource,
          configuration,
          note,
        }),
      ),
    },
    reportActivityList: quality(data.reportActivityList),
    reportFactoryList: quality(data.reportFactoryList),
  };
}

export function getMonteCarloParameters(data: MonteCarloRequest) {
  return request<{ data: MonteCarloParameterResult }>({
    method: 'post',
    url: `${prefix}/parameters`,
    data: monteCarloRequest(data),
  }).then(response => response.data.data);
}

export function previewMonteCarloParameter(
  data: Partial<MonteCarloParameter>,
  signal?: AbortSignal,
) {
  return request<{ data: MonteCarloPreview }>({
    method: 'post',
    url: `${prefix}/preview`,
    data: {
      mean: data.mean,
      uncertainty: data.uncertainty,
      uncertaintySource: data.uncertaintySource,
      configuration: data.configuration,
    },
    signal,
  }).then(response => response.data.data);
}

export async function getMonteCarloAIDefaults(
  data: MonteCarloRequest,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const {
    data: { data: submitted },
  } = await request<{ data: MonteCarloTask }>({
    method: 'post',
    url: `${prefix}/aiDefaults`,
    data: monteCarloRequest(data),
    signal,
  });
  const params = { calculationId: submitted.calculationId };
  const poll = async (task: MonteCarloTask): Promise<void> => {
    if (task.status !== 'QUEUED' && task.status !== 'RUNNING') return;
    signal.throwIfAborted();
    onProgress(task.progress);
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, 5000);
      signal.addEventListener('abort', abort, { once: true });
    });
    signal.throwIfAborted();
    const next = await request<{ data: MonteCarloTask }>({
      method: 'get',
      url: `${prefix}/aiDefaults/progress`,
      params,
      signal,
    }).then(response => response.data.data);
    return poll(next);
  };
  await poll(submitted);
  signal.throwIfAborted();
  // 失败状态也从结果接口取得业务错误，由统一请求层提示。
  return request<{ data: MonteCarloParameter[] }>({
    method: 'get',
    url: `${prefix}/aiDefaults/result`,
    params,
    signal,
  }).then(response => response.data.data);
}

export function calculateMonteCarlo(data: MonteCarloRequest) {
  return request<{ data: MonteCarloTask }>({
    method: 'post',
    url: `${prefix}/calculate`,
    data: {
      accountId: data.accountId,
      reportId: data.reportId,
      config: monteCarloRequest(data).config,
    },
  }).then(response => response.data.data);
}

export function getMonteCarloProgress(calculationId: string) {
  return request<{ data: MonteCarloTask }>({
    method: 'get',
    url: `${prefix}/progress`,
    params: { calculationId },
  }).then(response => response.data.data);
}

export function getMonteCarloResult(calculationId: string) {
  return request<{ data: MonteCarloResult }>({
    method: 'get',
    url: `${prefix}/result`,
    params: { calculationId },
  }).then(response => response.data.data);
}
