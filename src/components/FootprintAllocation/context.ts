import { createContext } from 'react';
import { AllocationAccount } from './types';

/** 仅快速核算建模提供上下文，不改变个人/项目、分享或过程核算的访问边界。 */
export const AllocationAccountContext = createContext<
  AllocationAccount | undefined
>(undefined);
