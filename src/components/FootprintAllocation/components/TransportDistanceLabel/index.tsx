import { LoadingOutlined } from '@ant-design/icons';
import { isField } from '@formily/core';
import type { Field } from '@formily/core';
import { ArrayBase } from '@formily/antd-v5';
import { observer, useField, useForm } from '@formily/react';
import { Button, Tooltip } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { request } from '@/api/request';
import I18N from '@src/lang/I18N';
import { Toast } from '@src/utils/Toast';

import styles from './index.module.less';

/** 只读取当前核算表单的路段，不提前保存计算结果。 */
export default observer(() => {
  const form = useForm();
  const field = useField<Field>();
  const index = ArrayBase.useIndex();
  const row = form.values.accountEmissionTransportList?.[index];
  const transportType = Number(row?.transportType);
  const departureAddress = String(row?.departureAddress ?? '').trim();
  const destinationAddress = String(row?.destinationAddress ?? '').trim();
  const routeKey = JSON.stringify([
    form.values.id,
    row?.id,
    index,
    transportType,
    row?.way,
    departureAddress,
    destinationAddress,
  ]);
  const requestId = useRef(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ key: string; distance: string }>();
  const readOnly = form.readPretty || field.readPretty || field.readOnly;
  const disabled = readOnly || field.disabled;
  const ready =
    [1, 2, 3, 4].includes(transportType) &&
    !!departureAddress &&
    !!destinationAddress;

  // 参数变化和组件卸载都使旧请求失效，避免异步结果串到其他路段。
  useEffect(() => {
    requestId.current += 1;
    setResult(undefined);
    setLoading(false);
    return () => {
      requestId.current += 1;
    };
  }, [routeKey]);

  /** 计算仅更新建议值，直到用户点击写入才触发表单输入。 */
  const calculate = async () => {
    if (!ready || disabled || loading) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const response = await request<{ data: string }>({
        method: 'POST',
        url: '/footprint3/accountEmissionTransport/calculateDistance',
        timeout: 110000,
        skipErrorToast: true,
        data: { transportType, departureAddress, destinationAddress },
      });
      if (currentRequest !== requestId.current) return;
      const distance = String(response.data.data ?? '');
      if (
        !/^\d+(?:\.\d{1,6})?$/.test(distance) ||
        Number(distance) < 0.000001 ||
        Number(distance) > 10000000000
      ) {
        throw new Error('Invalid transport distance');
      }
      setResult({ key: routeKey, distance });
    } catch (error) {
      if (currentRequest === requestId.current) {
        // 业务响应已经按登录态翻译；网络或无效数值使用本地语言兜底。
        const failure = error as { data?: { msg?: string } } | undefined;
        Toast(
          'error',
          failure?.data?.msg || I18N.carbonFootprint3.transportDistanceFailed,
        );
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  };

  /** 使用真实字段的输入入口，保留修改标记、校验和后续保存流程。 */
  const apply = () => {
    if (disabled || result?.key !== routeKey) return;
    const distanceField = form
      .query(`accountEmissionTransportList.${index}.distance`)
      .take();
    if (isField(distanceField)) {
      distanceField.onInput(result.distance);
      setResult(undefined);
    }
  };

  return (
    <span className={styles.label}>
      <span>{I18N.carbonFootprint.transportationMileage}</span>
      {!readOnly &&
        (result?.key === routeKey ? (
          <span className={styles.actions}>
            <strong>{result.distance} km</strong>
            <Button type='link' disabled={disabled} onClick={apply}>
              {I18N.carbonFootprint3.applyTransportDistance}
            </Button>
            <Button type='link' onClick={() => setResult(undefined)}>
              {I18N.carbonFootprint3.cancel}
            </Button>
          </span>
        ) : (
          <Tooltip
            title={
              ready
                ? I18N.carbonFootprint3.calculateTransportDistance
                : I18N.carbonFootprint3.transportDistanceRequired
            }
          >
            <span className={styles.iconWrapper}>
              <Button
                type='text'
                className={styles.calculate}
                aria-label={I18N.carbonFootprint3.calculateTransportDistance}
                disabled={disabled || !ready || loading}
                onClick={calculate}
              >
                {loading ? (
                  <LoadingOutlined />
                ) : (
                  <span className={styles.calculateIcon} aria-hidden />
                )}
              </Button>
            </span>
          </Tooltip>
        ))}
    </span>
  );
});
