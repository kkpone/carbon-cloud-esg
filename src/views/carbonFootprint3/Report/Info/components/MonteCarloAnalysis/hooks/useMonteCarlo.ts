import { useEffect, useRef, useState } from 'react';
import BigNumber from 'bignumber.js';
import { Form } from '@formily/core';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { defaultParameterNote } from '../parameterNotes';
import {
  calculateMonteCarlo,
  getMonteCarloParameters,
  getMonteCarloProgress,
  getMonteCarloResult,
} from '../service';
import {
  MonteCarloConfig,
  MonteCarloOptions,
  MonteCarloParameter,
  MonteCarloState,
  MonteCarloStates,
} from '../types';

export const emptyMonteCarloState = (): MonteCarloState => ({
  config: { iterations: 1000, parameters: [] },
  description: '',
});

function readSavedState(
  form: Form<Report>,
  accountId: number,
): MonteCarloState {
  const current = (
    form.getValuesIn('monteCarloByAccount') as MonteCarloStates | undefined
  )?.[accountId];
  if (current)
    return { ...current, stale: current.stale ?? current.result?.stale };
  const row = form.values.reportAccountList?.find(
    item => Number(item.accountId ?? item.accountName) === accountId,
  );
  const state = emptyMonteCarloState();
  if (!row) return state;
  if (row.monteCarloConfig) {
    state.config =
      typeof row.monteCarloConfig === 'string'
        ? JSON.parse(row.monteCarloConfig)
        : row.monteCarloConfig;
    state.parametersLoaded = true;
  }
  if (row.monteCarloResult)
    state.result =
      typeof row.monteCarloResult === 'string'
        ? JSON.parse(row.monteCarloResult)
        : row.monteCarloResult;
  state.description = row.monteCarloDescription || '';
  state.stale = state.result?.stale;
  return state;
}

function calculationParameters(config: MonteCarloConfig) {
  return JSON.stringify({
    iterations: config.iterations,
    parameters: config.parameters
      .map(row => ({
        id: row.id,
        unit: row.unit,
        mean: row.mean == null ? null : new BigNumber(row.mean).toFixed(),
        uncertainty:
          row.uncertainty == null
            ? null
            : new BigNumber(row.uncertainty).toFixed(),
        distribution: row.distribution,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}

/** 只合并请求期间没有被用户修改的字段，当前表单是唯一配置来源。 */
function mergeLoaded(
  initial: MonteCarloParameter[],
  current: MonteCarloParameter[],
  loaded: MonteCarloParameter[],
) {
  const before = new Map(initial.map(row => [row.id, row]));
  const now = new Map(current.map(row => [row.id, row]));
  const editable = [
    'mean',
    'uncertainty',
    'distribution',
    'uncertaintySource',
    'configuration',
    'note',
    'standardDeviation',
  ] as const;
  return loaded.map(row => {
    const old = before.get(row.id);
    const latest = now.get(row.id);
    if (!old || !latest) return row;
    const changes = Object.fromEntries(
      editable
        .filter(
          key =>
            !(key === 'standardDeviation' && old.unit !== row.unit) &&
            JSON.stringify(old[key]) !== JSON.stringify(latest[key]),
        )
        .map(key => [key, latest[key]]),
    );
    return { ...row, ...changes };
  });
}

export function useMonteCarlo(
  form: Form<Report>,
  accountId?: number,
  readOnly = false,
  enabled = false,
  options?: MonteCarloOptions,
) {
  const [loading, setLoading] = useState(false);
  const submitting = useRef(new Set<number>());
  const jobs = useRef(new Map<string, string>());
  const lifetime = useRef(0);
  const context = `${form.values.id ?? 'new'}:${form.values.type}:${
    form.values.accountType
  }`;
  const states = form.values.monteCarloByAccount as
    | MonteCarloStates
    | undefined;
  const state = accountId ? states?.[accountId] : undefined;
  const savedAccountReady =
    !form.values.id ||
    states !== undefined ||
    Boolean(
      form.values.reportAccountList?.some(
        row => Number(row.accountId ?? row.accountName) === accountId,
      ),
    );
  const quality = JSON.stringify({
    reportActivityList: form.values.reportActivityList?.map(
      ({ dataType, uncertain }) => ({ dataType, uncertain }),
    ),
    reportFactoryList: form.values.reportFactoryList?.map(
      ({ dataType, uncertain }) => ({ dataType, uncertain }),
    ),
  });
  const update = (id: number, next: MonteCarloState) => {
    const current = form.getValuesIn('monteCarloByAccount') as
      | MonteCarloStates
      | undefined;
    form.setValuesIn('monteCarloByAccount', { ...current, [id]: next });
  };

  useEffect(
    () => () => {
      lifetime.current++;
    },
    [context],
  );

  useEffect(() => {
    const version = lifetime.current;
    let cancelled = false;
    setLoading(false);
    if (!accountId || !savedAccountReady) return;
    const saved = readSavedState(form, accountId);
    update(accountId, {
      ...saved,
      parametersLoaded: readOnly || !enabled ? saved.parametersLoaded : false,
    });
    if (readOnly || !enabled || !options) return;
    setLoading(true);
    const checkedResultId = saved.result?.calculationId;
    const load = (requested: MonteCarloConfig): Promise<void> => {
      const initial = JSON.parse(
        JSON.stringify(requested.parameters),
      ) as MonteCarloParameter[];
      return getMonteCarloParameters({
        accountId,
        reportId: form.values.id,
        config: requested,
        calculationId: checkedResultId,
        ...JSON.parse(quality),
      }).then(loaded => {
        if (cancelled || lifetime.current !== version) return;
        const current = readSavedState(form, accountId);
        const before = new Map(initial.map(row => [row.id, row]));
        const now = new Map(
          current.config.parameters.map(row => [row.id, row]),
        );
        // 单位变化期间的新输入仍属于旧单位，交回后端重新换算，不在页面计算倍率。
        const needsConversion = loaded.parameters.some(row => {
          const old = before.get(row.id);
          const latest = now.get(row.id);
          return (
            old &&
            latest &&
            old.unit !== row.unit &&
            (String(old.mean) !== String(latest.mean) ||
              String(old.uncertainty) !== String(latest.uncertainty))
          );
        });
        if (needsConversion) return load(current.config);
        const parameters = mergeLoaded(
          initial,
          current.config.parameters,
          loaded.parameters,
        ).map(row =>
          row.note == null
            ? { ...row, note: defaultParameterNote(row, options) }
            : row,
        );
        const config = { ...current.config, parameters };
        const inputsChanged =
          Boolean(current.result) &&
          calculationParameters(current.config) !==
            calculationParameters(config);
        // 服务端过期标记只属于请求检查的结果，不能套到随后完成的新结果。
        const checkedResultUnchanged =
          checkedResultId !== undefined &&
          current.result?.calculationId === checkedResultId;
        update(accountId, {
          ...current,
          config,
          parametersLoaded: true,
          stale:
            current.stale ||
            inputsChanged ||
            (checkedResultUnchanged && loaded.resultStale),
        });
      });
    };
    load(saved.config)
      .catch(() => {
        /* 请求层统一提示，不增加页面错误状态。 */
      })
      .finally(() => {
        if (!cancelled && lifetime.current === version) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    accountId,
    quality,
    form,
    readOnly,
    enabled,
    savedAccountReady,
    context,
    options,
  ]);

  const calculationId = state?.calculationId;
  const running = Boolean(state?.running);
  useEffect(() => {
    if (!enabled || !accountId || !calculationId || !running) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const task = await getMonteCarloProgress(calculationId);
        if (cancelled) return;
        const current = readSavedState(form, accountId);
        if (current.calculationId !== calculationId) return;
        if (task.status === 'SUCCESS') {
          const result = await getMonteCarloResult(calculationId);
          if (cancelled) return;
          const latest = readSavedState(form, accountId);
          if (latest.calculationId !== calculationId) return;
          const submitted = jobs.current.get(calculationId);
          const stale = submitted
            ? submitted !== calculationParameters(latest.config)
            : Boolean(latest.stale);
          update(accountId, {
            ...latest,
            result,
            running: false,
            progress: 100,
            failed: false,
            stale,
          });
          return;
        }
        if (task.status === 'FAILED' || task.status === 'STALE') {
          update(accountId, {
            ...current,
            running: false,
            failed: task.status === 'FAILED',
            stale: true,
          });
          return;
        }
        update(accountId, { ...current, progress: task.progress });
        timeout = setTimeout(poll, 5000);
      } catch {
        if (cancelled) return;
        const current = readSavedState(form, accountId);
        if (current.calculationId === calculationId)
          update(accountId, { ...current, running: false, stale: true });
      }
    };
    timeout = setTimeout(poll, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [accountId, calculationId, running, enabled, context]);

  const changeConfig = (
    config: MonteCarloConfig,
    affectsCalculation = true,
  ) => {
    if (!accountId) return;
    const current = readSavedState(form, accountId);
    const changed =
      affectsCalculation &&
      calculationParameters(current.config) !== calculationParameters(config);
    update(accountId, {
      ...current,
      config,
      stale:
        current.stale ||
        Boolean(changed && (current.result || current.running)),
    });
  };

  const calculate = async () => {
    if (!accountId || submitting.current.has(accountId)) return;
    const current = readSavedState(form, accountId);
    if (current.running || !current.config.parameters.length) return;
    const version = lifetime.current;
    const signature = calculationParameters(current.config);
    submitting.current.add(accountId);
    // 旧结果继续展示，但新任务返回前不能拿旧任务编号启动轮询。
    update(accountId, {
      ...current,
      calculationId: undefined,
      running: true,
      progress: 0,
      failed: false,
      stale: Boolean(current.result) || current.stale,
    });
    try {
      const task = await calculateMonteCarlo({
        accountId,
        reportId: form.values.id,
        config: current.config,
      });
      if (lifetime.current !== version) return;
      jobs.current.set(task.calculationId, signature);
      const latest = readSavedState(form, accountId);
      update(accountId, {
        ...latest,
        running: true,
        calculationId: task.calculationId,
        progress: task.progress,
      });
    } catch {
      if (lifetime.current !== version) return;
      const latest = readSavedState(form, accountId);
      update(accountId, {
        ...latest,
        running: false,
        stale: Boolean(latest.result) || latest.stale,
      });
    } finally {
      submitting.current.delete(accountId);
    }
  };

  const changeDescription = (description: string) => {
    if (accountId)
      update(accountId, { ...readSavedState(form, accountId), description });
  };
  return {
    state: state || emptyMonteCarloState(),
    loading,
    changeConfig,
    changeDescription,
    calculate,
  };
}
