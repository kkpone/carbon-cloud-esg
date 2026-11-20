import { setValidateLanguage } from '@formily/core';
import { apiQuideList as getGuideList } from '@src/api/api';
import kiwiIntl, {
  LocaleType,
  initLocale,
  serviceLangMap,
  serviceLangMapReverse,
  setCurrentLocale,
} from '@src/lang/I18N';
import {
  buildLocaleSwitchPath,
  getLocalePathInfo,
} from '@src/router/localePath';
import { SET_COMPANY_USER_INFO } from '@src/store/actionTypes';
import { USER_KEY } from '@src/store/module/nav';
import { mapChildren } from '@src/utils';
import { getLoginStorage } from '@src/utils/feishuSession';
import {
  getLanguage,
  getLanguageByTicket,
  switchLanguage,
  switchLanguageByTicket,
} from '@src/views/system/login/service';
import { isAgentDeploy } from '@src/config/deploy';
import { useTitle } from 'ahooks';
import { Button, Result, Spin } from 'antd';
import { noop } from 'lodash-es';
import {
  createContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  FC,
} from 'react';

import { getProductPermission } from '../LayoutNavBar/utils';

type ChangeLocaleParams = {
  currentLocale: LocaleType;
  onlyFeSwitch?: boolean;
  syncUrl?: boolean;
  ticket?: string;
};

const titleMap = {
  [LocaleType.zhCN]: 'Carbon Agent',
  [LocaleType.zhTW]: 'Carbon Agent',
  [LocaleType.enUS]: 'Carbon Agent',
};

const cloudTitleMap = {
  [LocaleType.zhCN]: '碳云',
  [LocaleType.zhTW]: '碳雲',
  [LocaleType.enUS]: 'Carbon Cloud',
};

function getStoredCompanyUserInfo() {
  try {
    return JSON.parse(getLoginStorage().getItem(SET_COMPANY_USER_INFO) || '{}');
  } catch {
    return {};
  }
}

export const LocaleContext = createContext<{
  locale: LocaleType;
  changeLocale: (params: ChangeLocaleParams) => Promise<void> | void;
}>({
  locale: LocaleType.zhCN,
  changeLocale: noop,
});

/**
 * 脏代码，兼容原来的权限逻辑
 * @todo 重构登录和路由逻辑
 * GRT_NAV 为导航栏存储的信息
 * SET_COMPANY_USER_INFO 为用户信息和左侧 menu 信息
 * 切换中英文后，需要重新获取导航栏和用户信息
 */
async function updateGuideAndNav() {
  const productId = sessionStorage.getItem('productId') || '';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [res, info] = await getProductPermission(productId);
  const { data } = await getGuideList();
  getLoginStorage().removeItem(USER_KEY);
  const newArr = data.data.map(item => ({
    id: item.id,
    name: item.guideName,
    isFloat: item.isFloat.toString(),
    web_path: '',
    children: mapChildren(item?.categoryList || []),
    checkid: item.id,
  }));
  getLoginStorage().setItem(USER_KEY, JSON.stringify(newArr));
  if (info) {
    const preInfo = JSON.parse(
      getLoginStorage().getItem(SET_COMPANY_USER_INFO) || '',
    );
    getLoginStorage().setItem(
      SET_COMPANY_USER_INFO,
      JSON.stringify({
        ...preInfo,
        userInfo: info,
      }),
    );
  }
}

export const LocaleProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [locale, setLocale] = useState(initLocale);
  const [ready, setReady] = useState(typeof window === 'undefined');
  const [loadFailed, setLoadFailed] = useState(false);
  const [initialPathname] = useState(() =>
    typeof window === 'undefined' ? '/' : window.location.pathname,
  );

  // 同一产物服务两个域名：小碳域名保留 Carbon Agent，云端用 SaaS 名称。
  useTitle(isAgentDeploy ? titleMap[locale] : cloudTitleMap[locale]);

  useEffect(() => {
    setValidateLanguage(locale);
  }, [locale]);

  useEffect(() => {
    let active = true;
    const path = getLocalePathInfo(initialPathname);
    if (getLocalePathInfo().localePrefix) {
      window.history.replaceState(
        window.history.state,
        '',
        buildLocaleSwitchPath(path.localeCode),
      );
    }
    const ticket = new URLSearchParams(window.location.search).get('ticket');
    const loadLocale = async () => {
      let language: 'zh' | 'en' | 'zt' = path.localePrefix
        ? path.localeCode
        : 'zh';
      if (ticket) {
        language = (await getLanguageByTicket({ ticket }))?.lang || 'zh';
      } else if (getStoredCompanyUserInfo()?.access_token) {
        language = (await getLanguage())?.lang || 'zh';
      }
      return serviceLangMapReverse[language] || initLocale;
    };
    loadLocale()
      .then(nextLocale => {
        if (!active) return;
        setCurrentLocale(nextLocale);
        setLocale(nextLocale);
        kiwiIntl?.setLang?.(nextLocale);
        setValidateLanguage(nextLocale);
        setReady(true);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [initialPathname]);

  const changeLocale = useCallback(
    async ({ currentLocale, onlyFeSwitch, ticket }: ChangeLocaleParams) => {
      if (onlyFeSwitch) {
        setLocale(currentLocale);
        setCurrentLocale(currentLocale);
        kiwiIntl?.setLang?.(currentLocale);
        setValidateLanguage(currentLocale);

        return;
      }

      if (ticket) {
        await switchLanguageByTicket({
          lang: serviceLangMap[currentLocale],
          ticket,
        });
      } else {
        await switchLanguage({ lang: serviceLangMap[currentLocale] });
        await updateGuideAndNav();
      }

      window.location.reload();
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      locale,
      changeLocale,
    }),
    [locale, changeLocale],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {ready ? (
        children
      ) : loadFailed ? (
        <Result
          status='error'
          title={kiwiIntl.carbonproduct.unknownErrorPlease}
          extra={
            <Button onClick={() => window.location.reload()}>
              {kiwiIntl.ccdb.retry}
            </Button>
          }
        />
      ) : (
        <Spin size='large' fullscreen />
      )}
    </LocaleContext.Provider>
  );
};
