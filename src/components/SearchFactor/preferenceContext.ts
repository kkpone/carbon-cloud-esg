import { createContext } from 'react';

export const FactorPreferenceContext = createContext<{
  stage?: number;
  factorPrefId?: number | string;
}>({});
