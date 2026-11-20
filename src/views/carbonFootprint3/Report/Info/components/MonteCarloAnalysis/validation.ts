import { MonteCarloConfig, MonteCarloParameter } from './types';

export function parameterReady(row: MonteCarloParameter) {
  const uncertainty = Number(row.uncertainty);
  const mean = Number(row.mean);
  return (
    Boolean(row.distribution) &&
    row.uncertainty !== null &&
    row.uncertainty !== undefined &&
    row.uncertainty !== '' &&
    Number.isFinite(uncertainty) &&
    uncertainty >= 0 &&
    (row.valueHidden ||
      (row.mean !== null &&
        row.mean !== '' &&
        Number.isFinite(mean) &&
        (row.dataType === 'factor' || mean > 0)))
  );
}

export function monteCarloConfigReady(
  config?: MonteCarloConfig,
  parametersLoaded = false,
) {
  return Boolean(
    config &&
      Number.isInteger(config.iterations) &&
      Number(config.iterations) >= 1 &&
      Number(config.iterations) <= 99999 &&
      (parametersLoaded || config.parameters.length > 0) &&
      config.parameters.every(parameterReady),
  );
}
