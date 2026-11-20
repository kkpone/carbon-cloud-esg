import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Spin } from 'antd';
import moment from 'moment';
import { Suspense, useEffect } from 'react';
import type { ReactElement, ReactNode } from 'react';
import {
  BrowserRouter as Router,
  Redirect,
  Switch,
  Route,
  withRouter,
} from 'react-router-dom';
import type { RouteComponentProps } from 'react-router-dom';

import style from './app.module.less';
import { AICarbonFloatingProvider } from './components/AICarbonFloating/AICarbonContext';
import CarbonAgent from './components/CarbonAgent';
import { CarbonAgentProvider } from './components/CarbonAgent/context';
import ConditionalAICarbonFloating from './components/AICarbonFloating/ConditionalAICarbonFloating';
import { GlobalLoginModalProvider } from './components/GlobalLoginModal';
import { TrialUpgradeModalProvider } from './components/TrialUpgradeModal';
import {
  AGENT_HOME_PATH,
  CLOUD_HOME_PATH,
  isAgentDeploy,
  isAgentDomainAllowedPath,
  isAgentOnlyPath,
  isCloudDeploy,
} from './config/deploy';
import { getLocaleRouterBasename } from './router/localePath';
import { RouteMaps } from './router/route-paths';
import { layoutRouteList, useGetStatisticInfo } from './router/utils';
import { SET_COMPANY_USER_INFO } from './store/actionTypes';
import { getStatisticsRequest } from './utils/statistics';
import { useMobile } from './hooks/use-mobile';
import { isFeishuSession } from './utils/feishuSession';
import MobileLanding from './views/mobileLanding';

/**
 * 项目中 moment 使用太多了。一时半会迁移不了，所以使用了 @ant-design/moment-webpack-plugin
 * 但是 ant-design-pro 中引用 dayjs 做了一个 dayjs.extend() 的操作， moment.extend() 是不存在的,所以这里做了一个空函数，以免报错。迁移到 dayjs 后可以删除
 */
(moment as any).extend = function () {};
(moment as any).isDayjs = function () {
  return false;
};

const queryClient = new QueryClient();
const getStoredAccessToken = (storageValue: string | null) => {
  if (!storageValue) {
    return '';
  }

  try {
    const parsed = JSON.parse(storageValue) as unknown;

    if (
      parsed &&
      typeof parsed === 'object' &&
      'access_token' in parsed &&
      typeof parsed.access_token === 'string'
    ) {
      return parsed.access_token;
    }
  } catch {
    // Ignore incomplete storage writes and wait for the next event.
  }

  return '';
};

/**
 * 部署域名守卫：
 * - agent 域名只放行小碳相关路径，其余回到小碳首页；
 * - cloud 域名屏蔽小碳专属路径，回到工作台。
 */
const DeployScopeGuard = withRouter(
  ({
    children,
    location,
  }: RouteComponentProps & {
    children: ReactNode;
  }) => {
    const pathname = location.pathname.replace(/\/$/, '') || '/';

    if (isAgentDeploy && !isAgentDomainAllowedPath(pathname)) {
      return (
        <Redirect
          to={{
            pathname: AGENT_HOME_PATH,
            search: location.search,
          }}
        />
      );
    }

    if (!isAgentDeploy && isAgentOnlyPath(pathname)) {
      return <Redirect to={{ pathname: CLOUD_HOME_PATH }} />;
    }

    return children as ReactElement;
  },
);

/** 记录统计数据 */
const CatchRouterChange = withRouter(() => {
  const [statisticValue, location] = useGetStatisticInfo();
  useEffect(() => {
    const request = getStatisticsRequest();

    request({ data: statisticValue });
  }, [location]);
  return null;
});

function App() {
  const routerBasename = getLocaleRouterBasename();
  const isMobileViewport = useMobile();
  // 移动端落地页只属于云端 SaaS，小碳域名保持现有入口。
  const showMobileLanding = isCloudDeploy && isMobileViewport;

  useEffect(() => {
    const syncLoginAcrossTabs = (event: StorageEvent) => {
      if (isFeishuSession()) return;
      if (
        event.key === SET_COMPANY_USER_INFO &&
        getStoredAccessToken(event.oldValue) !==
          getStoredAccessToken(event.newValue)
      ) {
        window.location.reload();
      }
    };

    window.addEventListener('storage', syncLoginAcrossTabs);
    return () => window.removeEventListener('storage', syncLoginAcrossTabs);
  }, []);

  return (
    <Suspense
      fallback={
        <div className={style.center}>
          <Spin delay={200} size='large' />
        </div>
      }
    >
      {/* <AntdApp> */}
      <QueryClientProvider client={queryClient}>
        <GlobalLoginModalProvider>
          <TrialUpgradeModalProvider>
            <AICarbonFloatingProvider>
              <Router basename={routerBasename}>
                <CarbonAgentProvider>
                  <DeployScopeGuard>
                    <Switch>
                      {showMobileLanding ? (
                        <Route exact path='/' component={MobileLanding} />
                      ) : null}
                      {showMobileLanding ? (
                        <Redirect exact from={RouteMaps.login} to='/' />
                      ) : null}
                      {layoutRouteList.map(route => (
                        <Route
                          key={route.path}
                          path={route.path}
                          // 显式布局路由允许子路径，其余路由沿用原有匹配规则。
                          exact={route.exact ?? route.path !== '/'}
                          component={route.component}
                        />
                      ))}
                    </Switch>
                    <CatchRouterChange />
                  </DeployScopeGuard>
                  {/* 云端沿用 master 的嵌入式小碳；小碳域名使用自身产品入口 */}
                  {isCloudDeploy ? (
                    <CarbonAgent />
                  ) : (
                    <ConditionalAICarbonFloating />
                  )}
                </CarbonAgentProvider>
              </Router>
            </AICarbonFloatingProvider>
          </TrialUpgradeModalProvider>
        </GlobalLoginModalProvider>
      </QueryClientProvider>
      {/* </AntdApp> */}
    </Suspense>
  );
}

export default App;
