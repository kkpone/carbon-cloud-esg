import type { Locale } from 'antd/es/locale';
import Ant_en_US from 'antd/es/locale/en_US';
import Ant_zh_CN from 'antd/es/locale/zh_CN';
import Ant_zh_TW from 'antd/es/locale/zh_TW';
import KiwiIntl from 'kiwi-intl';

import enUS from './en-US/index';
import zhCN from './zh-CN/index';
import zhTW from './zh-TW';

export enum LocaleType {
  'zhCN' = 'zh-CN',
  'zhTW' = 'zh-TW',
  'enUS' = 'en-US',
}

export const serviceLangMap = {
  [LocaleType.zhCN]: 'zh',
  [LocaleType.zhTW]: 'zt',
  [LocaleType.enUS]: 'en',
} as const;

export const serviceLangMapReverse = {
  zh: LocaleType.zhCN,
  zt: LocaleType.zhTW,
  en: LocaleType.enUS,
} as const;

export const initLocale = LocaleType.zhCN;
let currentLocale: LocaleType = initLocale;
export const getCurrentLocale = () => currentLocale;
export const setCurrentLocale = (locale: LocaleType) => {
  currentLocale = locale;
};
// 项目内国际化资源
const kiwiIntl = KiwiIntl.init(initLocale, {
  [LocaleType.zhCN]: zhCN,
  [LocaleType.zhTW]: zhTW,
  [LocaleType.enUS]: enUS,
});

// 组件库国际化资源
export const AntdLocale: {
  [key in LocaleType]: Locale;
} = {
  [LocaleType.zhCN]: Ant_zh_CN,
  [LocaleType.zhTW]: Ant_zh_TW,
  [LocaleType.enUS]: Ant_en_US,
};

export default kiwiIntl as typeof kiwiIntl & {
  template: (str: string, args: object) => string;
};
