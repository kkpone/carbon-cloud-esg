import { ConfigProvider } from 'antd';
import { useContext } from 'react';

/** 跟随碳云 Ant Design 语言上下文，作为能碳查询及表单翻译依赖。 */
export function useLocale() {
  const { locale } = useContext(ConfigProvider.ConfigContext);
  return { locale: locale?.locale || 'zh-cn' };
}
