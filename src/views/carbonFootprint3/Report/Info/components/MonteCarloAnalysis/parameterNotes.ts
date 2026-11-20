import I18N from '@src/lang/I18N';
import { MonteCarloOptions, MonteCarloParameter } from './types';

export function defaultParameterNote(
  parameter: MonteCarloParameter,
  options?: MonteCarloOptions,
): string | undefined {
  if (parameter.uncertaintySource === 'DATA_QUALITY')
    return I18N.carbonFootprint3.mcQualityNote;
  if (parameter.uncertaintySource !== 'DEFAULT' || !parameter.configuration)
    return parameter.note;
  const config = parameter.configuration;
  const reference = options?.references.find(
    row => row.code === config.reference,
  );
  const category = options?.categories.find(
    row => row.reference === config.reference && row.code === config.category,
  );
  if (!reference || !category) return parameter.note;
  return I18N.template(I18N.carbonFootprint3.mcDefaultNote, {
    source: reference.name,
    category: category.name,
  });
}
