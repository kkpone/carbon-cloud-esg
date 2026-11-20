import { defaultParameterNote } from './parameterNotes';
import { MonteCarloOptions, MonteCarloParameter } from './types';

export type MonteCarloEditedFields = Map<
  string,
  Set<keyof MonteCarloParameter>
>;

export const emptyAIField = (value: unknown) =>
  value === undefined || value === null || value === '';

/** 逐字段补空；请求期间被改动后又清空的字段也不再自动填入。 */
export function mergeMonteCarloAIDefaults(
  before: MonteCarloParameter,
  current: MonteCarloParameter,
  suggestion: MonteCarloParameter,
  edited?: Set<keyof MonteCarloParameter>,
  options?: MonteCarloOptions,
): MonteCarloParameter {
  if (before.id !== current.id || current.id !== suggestion.id) return current;

  const canFill = (key: keyof MonteCarloParameter) =>
    emptyAIField(before[key]) &&
    emptyAIField(current[key]) &&
    !edited?.has(key);
  const next = { ...current };
  if (canFill('distribution')) next.distribution = suggestion.distribution;
  if (canFill('uncertainty')) next.uncertainty = suggestion.uncertainty;
  if (canFill('configuration')) next.configuration = suggestion.configuration;
  // 已有数量和因子不由分类工作流改写，受限因子的均值也不会回填。
  if (canFill('mean') && !current.valueHidden && suggestion.mean != null)
    next.mean = suggestion.mean;
  if (canFill('uncertaintySource') && !emptyAIField(next.uncertainty)) {
    next.uncertaintySource = emptyAIField(before.uncertainty)
      ? suggestion.uncertaintySource
      : 'MANUAL';
  }
  if (canFill('note')) next.note = defaultParameterNote(next, options);
  return next;
}
