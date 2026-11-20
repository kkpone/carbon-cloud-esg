import I18N from '@/lang/I18N';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { RouteMapsCorbonFootprint3 } from '@/router/route-paths/corbonFootprint3';
import {
  haveAccountEditPermissions,
  haveAccountInfoPermissions,
} from '@/views/carbonFootprint3/permissions';
import { FootprintAccountInfoUrlStatus } from '@/views/carbonFootprint3/FootprintAccount/constant';
import { api } from './api';
import { text } from './protocol';
import type { Data } from './protocol';
/** 以服务端实际模型信息定位，沿用业务查看/编辑权限与完成状态。 */
export function useModelNavigation() {
  const history = useHistory();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const open = async (accountId: string, productId?: string) => {
    if (loading) return;
    if (!haveAccountInfoPermissions()) {
      setError(I18N.carbonAgent.viewForbidden);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const model = await api<Data>(
        `/footprint3/account/info?id=${encodeURIComponent(accountId)}`,
      );
      const params = new URLSearchParams({
        accountId,
        productId: text(model.productId) || productId || '',
        status: String(
          haveAccountEditPermissions()
            ? FootprintAccountInfoUrlStatus.EDIT
            : FootprintAccountInfoUrlStatus.DETAIL,
        ),
        stepValue: text(model.accountStatus) || '1',
        listOrGraph: '1',
      });
      history.push(
        `${RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountDetail}?${params}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : I18N.carbonAgent.openModelFailed,
      );
    } finally {
      setLoading(false);
    }
  };
  return { open, error, loading };
}
