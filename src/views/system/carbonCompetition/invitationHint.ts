import I18N from '@/lang/I18N';
import type { Landing } from './types';

export function invitationHint(
  landing: Landing,
  authenticated: boolean,
  registrationAvailable = landing.registrationOpen,
): string | undefined {
  const t = I18N.carbonCompetition.invitationHints;
  if (!registrationAvailable || !landing.registrationOpen)
    return authenticated ? t.closed : t.closedGuest;
  if (landing.reason === 'INVITE_EXPIRED') return t.expired;
  if (landing.reason) return t.invalid;
  // 个人邀请不携带团队，canJoinTeam 为 false 不代表报名受限。
  if (!landing.teamId && !landing.teamName) return t.chooseTrack;
  if (!landing.canJoinTeam) return t.teamUnavailable;
  return landing.teamName;
}
