import { LoadingOutlined } from '@ant-design/icons';
import { Button, Form, Input, message, Tooltip } from 'antd';
import type { FormInstance } from 'antd';
import { useEffect, useRef, useState } from 'react';

import I18N from '@/lang/I18N';

import { calculateFactoryLocation } from '../../service';
import type { FactoryLocationResult, FactoryOption } from '../../types';
import styles from './index.module.less';

/** 手工坐标允许保留已有精度，但必须为范围内的十进制度。 */
const isCoordinate = (value: unknown, limit: number) =>
  typeof value === 'string' &&
  /^-?\d+(?:\.\d+)?$/.test(value.trim()) &&
  Math.abs(Number(value)) <= limit;

/** 建议值仅保留在当前抽屉，用户确认后同时写入两个坐标。 */
export default function FactoryLocationFields({
  form,
  open,
  factoryId,
  disabled,
}: {
  form: FormInstance<FactoryOption>;
  open: boolean;
  factoryId?: number;
  disabled: boolean;
}) {
  const country = String(Form.useWatch('country', form) ?? '').trim();
  const city = String(Form.useWatch('city', form) ?? '').trim();
  const detailedAddress = String(
    Form.useWatch('detailedAddress', form) ?? '',
  ).trim();
  const orgPath = Form.useWatch('orgPath', form);
  const longitude = Form.useWatch('longitude', form);
  const latitude = Form.useWatch('latitude', form);
  const key = JSON.stringify([
    open,
    factoryId,
    orgPath,
    country,
    city,
    detailedAddress,
    longitude,
    latitude,
  ]);
  const currentKey = useRef(key);
  currentKey.current = key;
  const requestId = useRef(0);
  const activeRequest = useRef<AbortController>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    key: string;
    value: Extract<FactoryLocationResult, { status: 'success' }>;
  }>();
  const ready =
    open &&
    !!country &&
    country.length <= 40 &&
    !!city &&
    city.length <= 40 &&
    !!detailedAddress &&
    detailedAddress.length <= 200;

  // 地址、实体、坐标或工厂变化，以及关闭或卸载时，使旧请求与建议失效。
  useEffect(() => {
    requestId.current += 1;
    activeRequest.current?.abort();
    setResult(undefined);
    setLoading(false);
    return () => {
      requestId.current += 1;
      activeRequest.current?.abort();
    };
  }, [key]);

  /** 请求仅计算建议；失败和地址歧义都保留原坐标。 */
  const calculate = async () => {
    if (!ready || disabled || loading) return;
    const id = ++requestId.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    try {
      const response = await calculateFactoryLocation(
        { country, city, detailedAddress },
        controller.signal,
      );
      if (id !== requestId.current || key !== currentKey.current) return;
      const value = response.data?.data;
      if (response.data?.code !== 200 || !value) {
        throw new Error('Invalid location response');
      }
      if (value.status === 'ambiguous' || value.status === 'not_found') {
        message.warning(
          value.status === 'ambiguous'
            ? I18N.cbamMonitor.locationAmbiguous
            : I18N.cbamMonitor.locationNotFound,
        );
        return;
      }
      if (
        value.status !== 'success' ||
        value.coordinateSystem !== 'WGS84' ||
        !isCoordinate(value.longitude, 180) ||
        !isCoordinate(value.latitude, 90) ||
        !value.matchedAddress
      ) {
        throw new Error('Invalid location coordinates');
      }
      setResult({ key, value });
    } catch {
      if (id === requestId.current && key === currentKey.current) {
        message.error(I18N.cbamMonitor.locationFailed);
      }
    } finally {
      if (id === requestId.current && key === currentKey.current) {
        setLoading(false);
      }
    }
  };

  /** 两个坐标通过同一次表单更新写入，仍由工厂确认按钮持久化。 */
  const apply = () => {
    if (disabled || !open || result?.key !== currentKey.current) return;
    form.setFields([
      {
        name: 'longitude',
        value: result.value.longitude,
        touched: true,
        errors: [],
      },
      {
        name: 'latitude',
        value: result.value.latitude,
        touched: true,
        errors: [],
      },
    ]);
    setResult(undefined);
  };

  /** 每个坐标建议放在对应输入框的标签旁，任一写入入口均同时写入经纬度。 */
  const renderLabel = (name: 'longitude' | 'latitude') => (
    <span className={styles.label}>
      <span>{I18N.cbamMonitor[name]}</span>
      {result?.key === key ? (
        <span className={styles.actions} aria-live='polite'>
          <strong>{result.value[name]}</strong>
          <Button type='link' disabled={disabled} onClick={apply}>
            {I18N.carbonFootprint3.applyTransportDistance}
          </Button>
          <Button type='link' onClick={() => setResult(undefined)}>
            {I18N.cbamMonitor.cancel}
          </Button>
        </span>
      ) : name === 'longitude' ? (
        <Tooltip
          title={
            ready
              ? I18N.cbamMonitor.calculateLocation
              : I18N.cbamMonitor.locationAddressRequired
          }
        >
          <span className={styles.iconWrapper}>
            <Button
              type='text'
              className={styles.calculate}
              aria-label={I18N.cbamMonitor.calculateLocation}
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
      ) : null}
    </span>
  );

  return (
    <>
      <Form.Item
        name='longitude'
        label={renderLabel('longitude')}
        rules={[
          { required: true, max: 50 },
          {
            validator: (_, value) =>
              !value || isCoordinate(value, 180)
                ? Promise.resolve()
                : Promise.reject(new Error(I18N.cbamMonitor.longitudeInvalid)),
          },
        ]}
      >
        <Input disabled={disabled} placeholder={I18N.cbamMonitor.enter} />
      </Form.Item>
      <Form.Item
        name='latitude'
        label={renderLabel('latitude')}
        rules={[
          { required: true, max: 50 },
          {
            validator: (_, value) =>
              !value || isCoordinate(value, 90)
                ? Promise.resolve()
                : Promise.reject(new Error(I18N.cbamMonitor.latitudeInvalid)),
          },
        ]}
      >
        <Input disabled={disabled} placeholder={I18N.cbamMonitor.enter} />
      </Form.Item>
    </>
  );
}
