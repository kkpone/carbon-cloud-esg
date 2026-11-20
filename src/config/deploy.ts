/**
 * 部署域名分流。
 *
 * 同一份构建产物同时部署在 agent* 与 ccloud* 域名下，运行时按 hostname 决定产品形态：
 * - agentxxxx.carbonstop.com  -> 小碳（Carbon Agent）产品
 * - ccloudxxxx.carbonstop.com -> 碳云 SaaS
 *
 * 其它域名（白标、saas、localhost、IP）默认按碳云 SaaS 处理。
 * 业务代码禁止直接读取 window.location.hostname，统一使用本模块。
 */
import { RouteMaps } from '@src/router/route-paths';
import { RouteMapsCorbonFootprint3 } from '@src/router/route-paths/corbonFootprint3';

export type DeployMode = 'agent' | 'cloud';

export const DEPLOY_MODES: DeployMode[] = ['agent', 'cloud'];

/** agent / agenttest / agent-pre / agentxxxx */
const AGENT_HOST_PATTERN = /^agent/i;
/** ccloud / ccloud-a-test / ccloudxxxx */
const CLOUD_HOST_PATTERN = /^ccloud/i;

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

const readSearch = () =>
  typeof window === 'undefined' ? '' : window.location.search;

const readHostname = () =>
  typeof window === 'undefined' ? '' : window.location.hostname;

export type ResolveDeployModeOptions = {
  hostname?: string;
  envMode?: string;
  search?: string;
};

/**
 * 优先级：显式环境变量（仅本地/临时验证）- URL 参数 - hostname - 兜底 cloud。
 */
export function resolveDeployMode(
  options: ResolveDeployModeOptions = {},
): DeployMode {
  const forced = normalize(options.envMode);
  if (forced === 'agent' || forced === 'cloud') return forced;

  const search = options.search ?? readSearch();
  const queryMode = normalize(
    new URLSearchParams(search).get('deployMode'),
  ) as DeployMode;
  if (queryMode === 'agent' || queryMode === 'cloud') return queryMode;

  const hostname = normalize(options.hostname ?? readHostname());
  if (AGENT_HOST_PATTERN.test(hostname)) return 'agent';
  if (CLOUD_HOST_PATTERN.test(hostname)) return 'cloud';

  return 'cloud';
}

export const DEPLOY_MODE: DeployMode = resolveDeployMode({
  envMode: process.env.REACT_APP_DEPLOY_MODE,
});

export const isAgentDeploy = DEPLOY_MODE === 'agent';

export const isCloudDeploy = DEPLOY_MODE === 'cloud';

export const isAgentHost = (hostname?: string) =>
  AGENT_HOST_PATTERN.test(normalize(hostname ?? readHostname()));

export const isCloudHost = (hostname?: string) =>
  CLOUD_HOST_PATTERN.test(normalize(hostname ?? readHostname()));

/**
 * WPS WebOffice 凭证：两侧注册的应用不同，按部署域名选择；
 * agent 侧未配置 `*_AGENT` 时回退公共值。
 */
export const WPS_APP_ID = isAgentDeploy
  ? process.env.REACT_APP_WPS_APP_ID_AGENT || process.env.REACT_APP_WPS_APP_ID
  : process.env.REACT_APP_WPS_APP_ID;

export const WPS_API_URL = isAgentDeploy
  ? process.env.REACT_APP_WPS_API_URL_AGENT || process.env.REACT_APP_WPS_API_URL
  : process.env.REACT_APP_WPS_API_URL;

export type RouteScope = DeployMode | DeployMode[];

/** 未声明 scope 的路由两端都可用。 */
export const isRouteInScope = (scope?: RouteScope) => {
  if (!scope) return true;

  return Array.isArray(scope)
    ? scope.includes(DEPLOY_MODE)
    : scope === DEPLOY_MODE;
};

type ScopedRoute = {
  scope?: RouteScope;
  children?: ScopedRoute[];
};

export function filterRoutesByScope<T extends ScopedRoute>(routes: T[]): T[] {
  return routes
    .filter(route => isRouteInScope(route.scope))
    .map(route =>
      route.children
        ? { ...route, children: filterRoutesByScope(route.children) }
        : route,
    );
}

/** 小碳首页；agent 域名下未放行的路径统一重定向到这里。 */
export const AGENT_HOME_PATH = RouteMaps.carbonAgent;

/** 碳云工作台；cloud 域名下访问小碳专属路径时重定向到这里。 */
export const CLOUD_HOME_PATH = RouteMaps.workIndex;

const AGENT_PROJECT_INVITE_PREFIX = RouteMaps.carbonAgentProjectInvite.replace(
  ':inviteCode',
  '',
);
const AGENT_SHARE_PREFIX = RouteMaps.carbonAgentShare.replace(':shareId', '');
const AGENT_FACTOR_PREFIX = RouteMaps.carbonAgentFactor.replace(
  ':factorId',
  '',
);
const AGENT_FEISHU_PREFIX = '/agent/feishu/';

/** 只属于小碳产品的路径；cloud 域名下访问会被重定向到工作台。 */
const AGENT_ONLY_PATHS: string[] = [
  RouteMaps.carbonAgent,
  RouteMaps.carbonAgentOAuthAuthorize,
  RouteMaps.carbonAgentDeviceAuthorize,
  RouteMaps.carbonAgentSsoCallback,
  AGENT_PROJECT_INVITE_PREFIX,
  AGENT_SHARE_PREFIX,
  AGENT_FACTOR_PREFIX,
  AGENT_FEISHU_PREFIX,
  '/system/carbonCompetition',
];

/** agent 域名下额外放行的共享页（与云端功能共用，但不属于小碳专属路径）。 */
const AGENT_DOMAIN_SHARED_PATHS: string[] = [
  RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountShareLogin,
  RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountShare,
  RouteMaps.enterpriseCarbonAccountingcarbonDischargeShare,
  RouteMaps.enterpriseCarbonAccountingAccountingShare,
  '/agreement',
];

const matchPath = (pathname: string, path: string) => {
  if (!path) return false;
  if (pathname === path) return true;
  const prefix = path.endsWith('/') ? path : `${path}/`;

  return pathname.startsWith(prefix);
};

export const isAgentOnlyPath = (pathname: string) =>
  AGENT_ONLY_PATHS.some(path => matchPath(pathname, path));

/** agent 域名只放行小碳相关路径，其余一律回到小碳首页。 */
export const isAgentDomainAllowedPath = (pathname: string) =>
  isAgentOnlyPath(pathname) ||
  AGENT_DOMAIN_SHARED_PATHS.some(path => matchPath(pathname, path));
