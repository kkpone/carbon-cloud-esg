type WorkspaceIdentity = {
  accessToken: string;
  companyId: string;
  userId: string;
};

const readWorkspaceIdentity = (
  value: string | null,
): WorkspaceIdentity | null => {
  if (!value) return { accessToken: '', companyId: '', userId: '' };
  try {
    const login = JSON.parse(value);
    if (!login || typeof login !== 'object') return null;
    return {
      accessToken: String(login.access_token || ''),
      companyId: String(login.userInfo?.companyId || login.companyId || ''),
      userId: String(login.userInfo?.userId || ''),
    };
  } catch {
    return null;
  }
};

export const hasWorkspaceIdentityChanged = (
  oldValue: string | null,
  newValue: string | null,
) => {
  const previous = readWorkspaceIdentity(oldValue);
  const next = readWorkspaceIdentity(newValue);
  if (!previous || !next) return false;
  return (
    previous.accessToken !== next.accessToken ||
    previous.companyId !== next.companyId ||
    previous.userId !== next.userId
  );
};
