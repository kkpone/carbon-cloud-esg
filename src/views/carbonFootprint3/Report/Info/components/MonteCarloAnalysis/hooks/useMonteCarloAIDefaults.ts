import { useEffect, useRef, useState } from 'react';
import { Form } from '@formily/core';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import {
  emptyAIField,
  mergeMonteCarloAIDefaults,
  MonteCarloEditedFields,
} from '../aiDefaults';
import {
  getMonteCarloAIDefaults,
  previewMonteCarloParameter,
} from '../service';
import {
  MonteCarloConfig,
  MonteCarloOptions,
  MonteCarloParameter,
  MonteCarloStates,
} from '../types';

function previewSignature(row: MonteCarloParameter) {
  return JSON.stringify([row.id, String(row.mean), String(row.uncertainty)]);
}

export function useMonteCarloAIDefaults(
  form: Form<Report>,
  accountId: number | undefined,
  enabled: boolean,
  readOnly: boolean,
  changeConfig: (config: MonteCarloConfig) => void,
  options?: MonteCarloOptions,
) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pending = useRef<AbortController>();
  const edited = useRef<MonteCarloEditedFields>(new Map());
  const context = `${form.values.id ?? 'new'}:${form.values.type}:${
    form.values.accountType
  }`;
  const quality = JSON.stringify([
    form.values.reportActivityList,
    form.values.reportFactoryList,
  ]);

  useEffect(() => {
    setLoading(false);
    return () => {
      pending.current?.abort();
      pending.current = undefined;
    };
  }, [accountId, enabled, readOnly, quality, context]);

  const markEdited = (
    row: MonteCarloParameter,
    patch: Partial<MonteCarloParameter>,
  ) => {
    if (!pending.current) return;
    const fields =
      edited.current.get(row.id) || new Set<keyof MonteCarloParameter>();
    (Object.keys(patch) as (keyof MonteCarloParameter)[]).forEach(key => {
      if (!Object.is(row[key], patch[key])) fields.add(key);
    });
    edited.current.set(row.id, fields);
  };

  const fill = async () => {
    if (!accountId || !enabled || readOnly || pending.current || !options)
      return;
    const initial = (
      form.getValuesIn('monteCarloByAccount') as MonteCarloStates
    )?.[accountId];
    if (!initial?.config.parameters.length) return;
    const snapshot = JSON.parse(
      JSON.stringify(initial.config),
    ) as MonteCarloConfig;
    const before = new Map(snapshot.parameters.map(row => [row.id, row]));
    const controller = new AbortController();
    pending.current = controller;
    edited.current = new Map();
    setProgress(0);
    setLoading(true);
    try {
      const suggestions = await getMonteCarloAIDefaults(
        {
          accountId,
          reportId: form.values.id,
          config: snapshot,
          reportActivityList: form.values.reportActivityList,
          reportFactoryList: form.values.reportFactoryList,
        },
        controller.signal,
        value => {
          if (pending.current === controller && !controller.signal.aborted)
            setProgress(value);
        },
      );
      if (controller.signal.aborted || pending.current !== controller) return;
      const suggested = new Map(suggestions.map(row => [row.id, row]));
      const deviations = new Map<
        string,
        { signature: string; value: MonteCarloParameter['standardDeviation'] }
      >();
      // 预览期间也允许编辑；只对变化后的数值重新预览，全部对应后再统一回填。
      const fillLatest = async (): Promise<void> => {
        if (controller.signal.aborted || pending.current !== controller) return;
        const current = (
          form.getValuesIn('monteCarloByAccount') as MonteCarloStates
        )?.[accountId];
        if (!current) return;
        const merged = current.config.parameters.map(row => {
          const original = before.get(row.id);
          const suggestion = suggested.get(row.id);
          return original && suggestion
            ? mergeMonteCarloAIDefaults(
                original,
                row,
                suggestion,
                edited.current.get(row.id),
                options,
              )
            : row;
        });
        merged.forEach(row => {
          const suggestion = suggested.get(row.id);
          if (
            row.standardDeviation != null &&
            previewSignature(row) ===
              previewSignature(
                current.config.parameters.find(item => item.id === row.id) ||
                  row,
              )
          ) {
            const original = current.config.parameters.find(
              item => item.id === row.id,
            );
            if (
              original &&
              String(original.mean) === String(row.mean) &&
              String(original.uncertainty) === String(row.uncertainty)
            ) {
              deviations.set(row.id, {
                signature: previewSignature(row),
                value: original.standardDeviation,
              });
            }
          }
          if (
            suggestion?.standardDeviation != null &&
            previewSignature(suggestion) === previewSignature(row)
          ) {
            deviations.set(row.id, {
              signature: previewSignature(row),
              value: suggestion.standardDeviation,
            });
          }
        });
        const missing = merged.filter(row => {
          if (
            !before.has(row.id) ||
            !suggested.has(row.id) ||
            row.valueHidden ||
            emptyAIField(row.mean) ||
            emptyAIField(row.uncertainty) ||
            !Number.isFinite(Number(row.mean)) ||
            !Number.isFinite(Number(row.uncertainty)) ||
            Number(row.uncertainty) < 0
          )
            return false;
          return deviations.get(row.id)?.signature !== previewSignature(row);
        });
        if (missing.length) {
          let cursor = 0;
          const previewNext = async (): Promise<void> => {
            if (cursor >= missing.length || controller.signal.aborted) return;
            const row = missing[cursor++];
            const result = await previewMonteCarloParameter(
              {
                mean: row.mean,
                uncertainty: row.uncertainty,
                uncertaintySource: 'MANUAL',
              },
              controller.signal,
            );
            deviations.set(row.id, {
              signature: previewSignature(row),
              value: result.standardDeviation,
            });
            return previewNext();
          };
          await Promise.all(
            Array.from({ length: Math.min(4, missing.length) }, previewNext),
          );
          return fillLatest();
        }
        changeConfig({
          ...current.config,
          parameters: merged.map(row => {
            const preview = deviations.get(row.id);
            return preview?.signature === previewSignature(row)
              ? { ...row, standardDeviation: preview.value }
              : row;
          }),
        });
      };
      await fillLatest();
    } catch {
      // 请求层统一提示；失败或取消均不回写本轮建议。
    } finally {
      if (pending.current === controller) {
        pending.current = undefined;
        setLoading(false);
      }
    }
  };

  return { loading, progress, fill, markEdited };
}
