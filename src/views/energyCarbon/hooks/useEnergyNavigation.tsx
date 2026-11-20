import { Result } from 'antd';
import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { ZodType, output } from 'zod';

/** 使用来源页面参数 schema 校验 URL，坏参数采用空查询的默认值。 */
export function useEnergySearch<S extends ZodType>(schema: S): output<S> {
  const { search } = useLocation();
  return useMemo(() => {
    const raw = Object.fromEntries(new URLSearchParams(search).entries());
    const value = schema.safeParse(raw);
    return value.success ? value.data : schema.parse({});
  }, [schema, search]);
}
/** 能碳页面保留已有参数语义，通过现有 React Router 导航。 */
export function useNavigate() {
  const history = useHistory();
  const location = useLocation();
  return useCallback(
    async (options: {
      to?: string;
      search?:
        | Record<string, unknown>
        | ((previous: Record<string, string>) => Record<string, unknown>);
      replace?: boolean;
    }) => {
      const values =
        typeof options.search === 'function'
          ? options.search(
              Object.fromEntries(
                new URLSearchParams(location.search).entries(),
              ),
            )
          : options.search || {};
      const params = new URLSearchParams();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '')
          params.set(key, String(value));
      });
      const destination = {
        pathname: options.to || location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      };
      if (options.replace) history.replace(destination);
      else history.push(destination);
    },
    [history, location.pathname, location.search],
  );
}
/** 页面授权失败不渲染业务组件，不发起业务查询。 */
export function EnergyForbidden() {
  return <Result status='403' />;
}
