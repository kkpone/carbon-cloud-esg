import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);

  return () => mediaQuery.removeEventListener('change', onStoreChange);
};

const getSnapshot = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(MOBILE_MEDIA_QUERY).matches;

const getServerSnapshot = () => false;

export function useMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
