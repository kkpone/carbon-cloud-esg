import type { Me, Phase } from '../../types';

export type TaskModule = 'C' | 'R' | 'E' | 'O' | 'S';
export const taskModules: TaskModule[] = ['C', 'R', 'E', 'O', 'S'];
export function canSubmitModule(
  me: Me | undefined,
  module: TaskModule,
): boolean {
  const p = me?.participant;
  if (!p || p.status !== 'REGISTERED' || p.eligible === false) return false;
  return (
    module === 'C' ||
    module === 'E' ||
    (p.track === 'ENTERPRISE' && p.role === 'CAPTAIN')
  );
}
export function phaseStatus(
  phase: Phase | undefined,
  now = Date.now(),
): string {
  if (
    !phase?.enabled ||
    !phase.confirmed ||
    !phase.opensAt ||
    !phase.closesAt ||
    now < Date.parse(phase.opensAt)
  )
    return 'NOT_OPEN';
  return now < Date.parse(phase.closesAt) ? 'OPEN' : 'CLOSED';
}
