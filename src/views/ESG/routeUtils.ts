import { stripLocalePrefixFromPathname } from '@/router/localePath';
import { RouteMaps } from '@/router/route-paths';

/**
 * 保留当前路由前缀（/ESG、/ESG2、/esg2），避免在 ESG2 入口跳转回 /ESG 导致权限或导航错位
 */
export const resolveEsgRoute = (targetPath: string, currentPathname?: string): string => {
  const pathname =
    currentPathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '');
  const normalized = stripLocalePrefixFromPathname(pathname);
  const prefixMatch = normalized.match(/^\/(ESG2|esg2|ESG)(?=\/|$)/);
  const currentPrefix = prefixMatch ? `/${prefixMatch[1]}` : '/ESG';
  return targetPath.replace(/^\/ESG(?=\/|$)/, currentPrefix);
};

export const ESG_HIDDEN_AGENT_PREFIXES = [
  RouteMaps.ESGAiGenerateDetail,
  '/ESG2/aiGenerateDetail',
  '/esg2/aiGenerateDetail',
];
