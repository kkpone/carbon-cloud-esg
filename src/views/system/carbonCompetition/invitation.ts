import store from '@src/store';
import { getToken } from '@/utils/cookie';

const guestKey = (code: string) =>
  `competition-invitation-guest-v2:${encodeURIComponent(code)}`;
const receiptKey = (code: string, owner: string) =>
  `competition-receipt-v2:${encodeURIComponent(code)}:${owner}`;

function guestOwner(code: string): string {
  // 初始上下文用固定键，避免多标签首次并发读取空值时各生成一个上下文。
  return `guest:${localStorage.getItem(guestKey(code)) || 'initial'}`;
}

export function invitationOwner(code: string): string {
  const userId = store.getState().companyUserInfo.userInfo?.userId;
  return getToken() && userId ? `user:${userId}` : guestOwner(code);
}

export function invitationReceipt(
  code: string,
  owner = invitationOwner(code),
): string {
  // 空字符串明确表示本账号无凭据，禁止服务端回退到浏览器共享的旧 Cookie。
  return localStorage.getItem(receiptKey(code, owner)) || '';
}

export function saveInvitationReceipt(
  code: string,
  owner: string,
  receipt: string,
) {
  // 账号切换或匿名凭据交接后，旧请求的回包不能写回当前会话。
  if (owner === invitationOwner(code)) {
    localStorage.setItem(receiptKey(code, owner), receipt);
  }
}

export function clearInvitationReceipt(
  code: string,
  owner: string,
  receipt: string,
) {
  if (invitationReceipt(code, owner) === receipt) {
    localStorage.removeItem(receiptKey(code, owner));
  }
}

export function restoreInvitation(code: string): string[] {
  const owner = invitationOwner(code);
  if (!owner.startsWith('user:')) return [];
  const guest = guestOwner(code);
  const pendingKey = `${receiptKey(code, owner)}:pending`;
  const pending: string[] = JSON.parse(
    localStorage.getItem(pendingKey) || '[]',
  );
  const legacyKey = `competition-receipt:${code}`;
  const receipt = invitationReceipt(code, guest);
  const legacy = localStorage.getItem(legacyKey);
  for (const candidate of [receipt, legacy]) {
    if (candidate && !pending.includes(candidate)) pending.push(candidate);
  }
  // 先持久化到当前账号，再消耗匿名/旧版共享凭据；网络失败仍可由本账号重试。
  localStorage.setItem(pendingKey, JSON.stringify(pending));
  localStorage.removeItem(receiptKey(code, guest));
  localStorage.removeItem(legacyKey);
  localStorage.setItem(guestKey(code), crypto.randomUUID());
  return pending;
}

export function finishInvitationRestore(
  code: string,
  owner: string,
  receipt: string,
  accepted: boolean,
) {
  if (accepted && !invitationReceipt(code, owner)) {
    saveInvitationReceipt(code, owner, receipt);
  }
  const key = `${receiptKey(code, owner)}:pending`;
  const pending: string[] = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(
    key,
    JSON.stringify(pending.filter(item => item !== receipt)),
  );
}
