import KiwiIntl from 'kiwi-intl';
import zhCNcarbonAgent from '../../src/lang/zh-CN/carbonAgent';
import zhCNproductCarbonFootprintAI from '../../src/lang/zh-CN/productCarbonFootprintAI';
import zhCNcarbonFootprint3 from '../../src/lang/zh-CN/carbonFootprint3';
import zhTWcarbonAgent from '../../src/lang/zh-TW/carbonAgent';
import zhTWproductCarbonFootprintAI from '../../src/lang/zh-TW/productCarbonFootprintAI';
import zhTWcarbonFootprint3 from '../../src/lang/zh-TW/carbonFootprint3';
import enUScarbonAgent from '../../src/lang/en-US/carbonAgent';
import enUSproductCarbonFootprintAI from '../../src/lang/en-US/productCarbonFootprintAI';
import enUScarbonFootprint3 from '../../src/lang/en-US/carbonFootprint3';
import { createContext } from 'react';
import { createStore } from 'redux';

export const store = createStore(
  (
    state = { companyUserInfo: { access_token: 'fixture-org-a' } },
    action: { type: string; token?: string },
  ) =>
    action.type === 'identity'
      ? { companyUserInfo: { access_token: action.token || '' } }
      : state,
);
export const getToken = () => store.getState().companyUserInfo.access_token;
export const logout = () => store.dispatch({ type: 'identity', token: '' });
const requestedLocale = new URLSearchParams(window.location.search).get('lang');
const locale =
  requestedLocale === 'en-US' || requestedLocale === 'zh-TW'
    ? requestedLocale
    : 'zh-CN';
export const LocaleContext = createContext({ locale });
export const serviceLangMap = { 'zh-CN': 'zh', 'zh-TW': 'zt', 'en-US': 'en' };
export const haveAccountInfoPermissions = () => true;
export const haveAccountEditPermissions = () => true;
export const FootprintAccountInfoUrlStatus = { EDIT: 2, DETAIL: 3 };
export const RouteMapsCorbonFootprint3 = {
  carbonFootprint3FootprintAccountDetail: '/model',
};
export const RouteMaps = {
  enterpriseCarbonAccountingNoLoginTaskList: '/no-login/tasks',
  enterpriseCarbonAccountingNoLoginApprovalList: '/no-login/approval',
  questionnaireFill: '/questionnaire/:id',
  ESGImportanceAnalysisFill: '/survey/:id',
  scanLogin: '/scanLogin',
};
export default KiwiIntl.init(locale, {
  'zh-CN': {
    carbonAgent: zhCNcarbonAgent,
    productCarbonFootprintAI: zhCNproductCarbonFootprintAI,
    carbonFootprint3: zhCNcarbonFootprint3,
  },
  'zh-TW': {
    carbonAgent: zhTWcarbonAgent,
    productCarbonFootprintAI: zhTWproductCarbonFootprintAI,
    carbonFootprint3: zhTWcarbonFootprint3,
  },
  'en-US': {
    carbonAgent: enUScarbonAgent,
    productCarbonFootprintAI: enUSproductCarbonFootprintAI,
    carbonFootprint3: enUScarbonFootprint3,
  },
});
