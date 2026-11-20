import { Input, InputNumber, Select } from 'antd';
import { useContext, useEffect, useState, useId } from 'react';
import I18N, { LocaleType } from '@src/lang/I18N';
import { LocaleContext } from '@/components/LocaleProvider';
import { request } from '@/api/request';
import { allocationPercentage } from '../../calculation';
import { AllocationConfig } from '../../types';
import styles from './index.module.less';
import chevronIcon from '../../assets/chevron.svg';
import infoIcon from '../../assets/info.svg';

interface UnitRow {
  dictValue: string;
  dictLabel: string;
  sourceName: string;
}
interface Props {
  value: AllocationConfig;
  onChange: (value: AllocationConfig) => void;
  physicalUnitCode?: string;
  physicalUnitName?: string;
  readOnly?: boolean;
  /** 排放源浮层使用 32px 紧凑控件。 */
  compact?: boolean;
}

/** 阶段与单个排放源共用的分配字段，布局和尺寸来自Figma设计代码。 */
const AllocationEditor = ({
  value,
  onChange,
  physicalUnitCode,
  physicalUnitName,
  readOnly,
  compact = false,
}: Props) => {
  const t = I18N.carbonFootprint3;
  const { locale } = useContext(LocaleContext);
  const id = useId();
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [unitError, setUnitError] = useState(false);
  useEffect(() => {
    let active = true;
    request<{ data: { factorUnitM: UnitRow[] } }>({
      url: '/management/system/enum/listALLByDictTypeBatch',
      method: 'GET',
      params: {
        dictTypes: 'factorUnitM',
        lang: locale === LocaleType.enUS ? 'en' : 'zh',
      },
    })
      .then(response => {
        if (active) setUnits(response.data.data.factorUnitM || []);
      })
      .catch(() => {
        if (active) setUnitError(true);
      });
    return () => {
      active = false;
    };
  }, [locale]);
  const method = value.method ?? 1;
  // 按单位编码读取当前语言字典，避免反显存量配置中的中文单位名称。
  const unitCode =
    method === 1 ? physicalUnitCode || value.unitCode : value.unitCode;
  const unitLabel =
    units.find(unit => unit.dictValue === unitCode)?.dictLabel ||
    (method === 1 ? physicalUnitName || value.unitName : value.unitName);
  const options = units
    .filter(unit =>
      method === 2
        ? /currency|货币|貨幣/i.test(unit.sourceName)
        : /time|时间|時間/i.test(unit.sourceName),
    )
    .map(unit => ({ value: unit.dictValue, label: unit.dictLabel }))
    .sort(
      (left, right) =>
        Number(/^(元|CNY)$/.test(right.label)) -
        Number(/^(元|CNY)$/.test(left.label)),
    );
  const labels =
    method === 2
      ? [t.task1TotalEconomic, t.task1CurrentEconomic]
      : method === 3
      ? [t.task1TotalTime, t.task1CurrentTime]
      : [t.task1TotalPhysical, t.task1CurrentPhysical];
  const change = (patch: Partial<AllocationConfig>) =>
    onChange({ ...value, ...patch });
  return (
    <div className={`${styles.editor} ${compact ? styles.compact : ''}`}>
      <div className={styles.grid}>
        <label className={styles.field} htmlFor={`${id}-method`}>
          <span>
            <b>*</b>
            {t.task1AllocationMethod}
          </span>
          <Select
            placeholder={t.pleaseSelect}
            suffixIcon={<img src={chevronIcon} alt='' />}
            id={`${id}-method`}
            disabled={readOnly}
            value={method}
            options={[
              { value: 1, label: t.task1Physical },
              { value: 2, label: t.task1Economic },
              { value: 3, label: t.task1Time },
            ]}
            onChange={next =>
              change({
                method: next,
                unitCode: next === 1 ? physicalUnitCode : undefined,
                unitName: next === 1 ? physicalUnitName : undefined,
              })
            }
          />
        </label>
        <label className={styles.field} htmlFor={`${id}-unit`}>
          <span>
            <b>*</b>
            {method === 2
              ? t.task1Currency
              : compact && method === 1
              ? t.task1PhysicalUnit
              : I18N.carbonFootprint.unit}
          </span>
          {method === 1 && compact ? (
            <Input id={`${id}-unit`} disabled value={unitLabel} />
          ) : method === 1 ? (
            <Select
              placeholder={t.pleaseSelect}
              suffixIcon={<img src={chevronIcon} alt='' />}
              id={`${id}-unit`}
              disabled
              value={unitCode}
              options={[
                {
                  value: unitCode,
                  label: unitLabel,
                },
              ]}
            />
          ) : (
            <Select
              placeholder={t.pleaseSelect}
              suffixIcon={<img src={chevronIcon} alt='' />}
              id={`${id}-unit`}
              disabled={readOnly}
              value={value.unitCode}
              options={options}
              status={unitError ? 'error' : undefined}
              onChange={(code, option) =>
                change({
                  unitCode: code,
                  unitName: (option as { label: string }).label,
                })
              }
            />
          )}
        </label>
        {labels.map((label, index) => (
          <label
            className={styles.field}
            key={label}
            htmlFor={`${id}-${index}`}
          >
            <span className={styles.fieldLabel}>
              <span>
                <b>*</b>
                {label}
              </span>
              {index === 0 && <img src={infoIcon} alt='' aria-hidden='true' />}
            </span>
            <InputNumber
              id={`${id}-${index}`}
              stringMode
              placeholder={t.pleaseEnter}
              controls={false}
              disabled={readOnly}
              min='0.01'
              precision={2}
              maxLength={20}
              value={index === 0 ? value.totalAmount : value.currentAmount}
              addonAfter={unitLabel}
              onChange={amount =>
                change(
                  index === 0
                    ? { totalAmount: amount === null ? '' : String(amount) }
                    : { currentAmount: amount === null ? '' : String(amount) },
                )
              }
            />
          </label>
        ))}
      </div>
      <div className={styles.ratio}>
        {t.task1AllocationRatio}：
        <strong>{allocationPercentage(value) || '-'}%</strong>
      </div>
    </div>
  );
};
export default AllocationEditor;
