import I18N from '@src/lang/I18N';
import cloudFavicon from '@src/assets/images/favicon.png';
import { Empty, App as AntdApp } from 'antd';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import 'antd/dist/reset.css';

import './styles/index.less';
import './styles/public.scss';

import App from './App';
import { isAgentDeploy } from './config/deploy';
import FeishuLoginGate from './components/FeishuLoginGate';
import { AntdProvider } from './components/AntProvider';
import { LocaleProvider } from './components/LocaleProvider';
import { SubscriptionServiceModalProvider } from './components/SubscriptionServiceModal';
import store from './store';
import agentFavicon from '../public/favicon.png';

if (process.env.NODE_ENV !== 'development') {
  (window as unknown as Record<'__FORMILY_DEV_TOOLS_HOOK__', null>)[
    '__FORMILY_DEV_TOOLS_HOOK__'
  ] = null;
}

// 暂无数据
export const customizeRenderEmpty = () => (
  <Empty
    image={Empty.PRESENTED_IMAGE_SIMPLE}
    description={
      <span>{I18N.carbonFootprint3.thereIsCurrentlyNoDataAvailable}</span>
    }
  />
);

const root = createRoot(document.getElementById('root'));

// 标题随部署域名切换，避免同一产物在两端显示对方产品名。
document.title = isAgentDeploy
  ? I18N.carbonAgent.carbonCloud
  : I18N.carbonFootprint3.carbonCloud;
const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (favicon) favicon.href = isAgentDeploy ? agentFavicon : cloudFavicon;

const appShell = (
  <LocaleProvider>
    <AntdProvider>
      <SubscriptionServiceModalProvider>
        <AntdApp>
          <Provider store={store}>
            <App />
          </Provider>
        </AntdApp>
      </SubscriptionServiceModalProvider>
    </AntdProvider>
  </LocaleProvider>
);

// 飞书登录门禁只属于小碳域名，云端 SaaS 不挂载。
root.render(
  isAgentDeploy ? <FeishuLoginGate>{appShell}</FeishuLoginGate> : appShell,
);
