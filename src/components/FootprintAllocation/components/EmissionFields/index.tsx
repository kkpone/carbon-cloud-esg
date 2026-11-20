import { Form, isField, onFormValuesChange } from '@formily/core';
import { observer, useField, useForm } from '@formily/react';
import {
  Collapse,
  Input,
  InputNumber,
  Popover,
  Switch,
  Button,
  Tooltip,
  message,
} from 'antd';
import { useContext, useEffect, useState, useId } from 'react';
import BigNumber from 'bignumber.js';
import I18N, { LocaleType } from '@src/lang/I18N';
import { request } from '@/api/request';
import { LocaleContext } from '@/components/LocaleProvider';
import AllocationEditor from '../AllocationEditor';
import { AllocationAccountContext } from '../../context';
import { AllocationAccount, AllocationConfig, STAGE_KEYS } from '../../types';
import {
  allocationPercentage,
  isAllocationValid,
  unitAmount,
} from '../../calculation';
import styles from './index.module.less';
import infoIcon from '../../assets/info.svg';
import configureIcon from '../../assets/configure.svg';
import detailsClosedIcon from '../../assets/details-closed.svg';
import detailsOpenIcon from '../../assets/details-open.svg';
import consumptionCloseIcon from '../../assets/consumption-close.svg';

export interface CalculationOptions {
  accountId?: number;
  stage?: number;
  enabled?: boolean;
  isNew?: boolean;
}
type Values = {
  amount?: string;
  unitName?: string;
  unitCode?: string | string[];
  type?: number;
  lossRate?: string;
  unitAmount?: string;
  allocation?: AllocationConfig;
  id?: number;
  accountEmissionTransportList?: Array<{
    amount?: string;
    quantity?: string;
    unitAmount?: string;
    unitName?: string;
    factorObjUnitString?: string;
    way?: number;
    transportType?: number;
  }>;
};
const wasteTypes = [21, 22, 23, 24];

/** 原始A、分配与损耗变化时刷新D；运输初值与手工覆盖值分别处理。 */
const installCalculation = (form: Form, stageConfig?: AllocationConfig) => {
  const values = form.values as Values;
  const originalConfig = values.allocation;
  const effective =
    originalConfig?.enabled && originalConfig.rule !== 1
      ? { ...stageConfig, enabled: !!stageConfig?.enabled, rule: 0 }
      : originalConfig;
  // 阶段状态仅参与计算，不回写排放源开关，避免开启后立即被关闭。
  const previousD = values.unitAmount;
  const next = unitAmount(
    values.amount,
    effective,
    [1, 2, 3, 4].includes(Number(values.type)) ? values.lossRate : undefined,
  );
  if (values.unitAmount !== next) form.setValuesIn('unitAmount', next);
  const list = values.accountEmissionTransportList || [];
  list.forEach((route, index) => {
    if (Number(route.transportType) === 1 && Number(route.way) === 3) {
      const nextD = unitAmount(
        route.quantity ?? route.amount,
        effective,
        [1, 2, 3, 4].includes(Number(values.type))
          ? values.lossRate
          : undefined,
      );
      if (route.unitAmount !== nextD) {
        form.setValuesIn(
          ['accountEmissionTransportList', index, 'unitAmount'],
          nextD,
        );
      }
      return;
    }
    if (route.transportType === 1 && route.way !== 1) return;
    const weightField = form
      .query(`accountEmissionTransportList.${index}.amount`)
      .take();
    const followsDefault =
      !(isField(weightField) && weightField.selfModified) &&
      route.amount === previousD;
    if (
      wasteTypes.includes(Number(values.type)) ||
      route.amount === undefined ||
      route.amount === '' ||
      followsDefault
    ) {
      if (next && route.amount !== next)
        form.setValuesIn(
          ['accountEmissionTransportList', index, 'amount'],
          next,
        );
    }
    form
      .query(`accountEmissionTransportList.${index}.amount`)
      .forEach(field => {
        field.setComponentProps({
          disabled: wasteTypes.includes(Number(values.type)) || form.readPretty,
        });
      });
  });
};

/** 与消耗数量同一行展示结果；复用单位下拉字典，避免名称仅在保存后才有值。 */
export const UnitProductLabel = observer(
  ({ stage = 0 }: CalculationOptions) => {
    const form = useForm();
    const account = useContext(AllocationAccountContext);
    const { locale } = useContext(LocaleContext);
    const [open, setOpen] = useState(false);
    const t = I18N.carbonFootprint3;
    const values = form.values as Values;
    const unitField = form.query('unitCode').take();
    const options: Array<{
      children?: Array<{ value?: string | number; label?: string }>;
    }> = isField(unitField) ? unitField.dataSource || [] : [];
    const units = options.flatMap(option => option.children || []);
    const unitCode = Array.isArray(values.unitCode)
      ? values.unitCode[values.unitCode.length - 1]
      : values.unitCode;
    const unitLabel =
      units.find(unit => String(unit.value) === String(unitCode))?.label ||
      values.unitName ||
      '';
    const functionalUnit =
      units.find(unit => String(unit.value) === String(account?.unitCode))
        ?.label || account?.unitName;
    const resultUnit =
      unitLabel && functionalUnit
        ? `${unitLabel}/${functionalUnit}`
        : unitLabel;
    const effectiveAllocation =
      values.allocation?.enabled && values.allocation.rule !== 1
        ? account?.stageAllocation?.[STAGE_KEYS[stage]]
        : values.allocation;
    const percentage = allocationPercentage(effectiveAllocation);
    const coefficient = percentage
      ? new BigNumber(percentage).dividedBy(100).toFixed()
      : '-';
    // 仅展示时去掉小数末尾的零，表单仍保留原始计算精度。
    const displayUnitAmount = values.unitAmount
      ? new BigNumber(values.unitAmount).toFixed()
      : '-';
    const hasLoss =
      [1, 2, 3, 4].includes(Number(values.type)) && !!values.lossRate;
    return (
      <span className={styles.amountLabel} lang={locale}>
        {t.consumptionQuantity}
        <Popover
          trigger='click'
          placement='topRight'
          arrow={false}
          open={open}
          onOpenChange={setOpen}
          overlayClassName={styles.consumptionPopover}
          content={
            <div className={styles.consumptionContent}>
              <div className={styles.consumptionHeader}>
                <span>{t.task1UnitConsumption}</span>
                <button
                  type='button'
                  className={styles.consumptionClose}
                  aria-label={t.close}
                  onClick={() => setOpen(false)}
                >
                  <img src={consumptionCloseIcon} alt='' />
                </button>
              </div>
              <div className={styles.consumptionResult}>
                {displayUnitAmount} {resultUnit}
              </div>
              <div className={styles.consumptionRows}>
                <div>
                  <span>{t.consumptionQuantity}</span>
                  <span>
                    {values.amount || '-'} {unitLabel}
                  </span>
                </div>
                <div>
                  <span>{t.task1AllocationRatio}</span>
                  <span>{coefficient}</span>
                </div>
                {hasLoss && (
                  <div>
                    <span>{t.task1Loss}</span>
                    <span>{values.lossRate}%</span>
                  </div>
                )}
              </div>
              <div className={styles.formula}>
                {values.amount || '-'} {unitLabel} × {coefficient}
                {hasLoss && ` ÷ (1 − ${values.lossRate}%)`} ={' '}
                {displayUnitAmount} {resultUnit}
              </div>
            </div>
          }
        >
          <button
            type='button'
            className={`${styles.textButton} ${styles.consumptionTrigger}`}
            aria-expanded={open}
          >
            {t.task1UnitProduct}：{displayUnitAmount} {resultUnit}
          </button>
        </Popover>
      </span>
    );
  },
);

/** 排放源分配入口，沿用阶段只读，自定义使用独立配置。 */
export const AllocationControl = observer(
  ({ accountId, stage = 0, enabled, isNew }: CalculationOptions) => {
    const form = useForm();
    const contextAccount = useContext(AllocationAccountContext);
    const { locale } = useContext(LocaleContext);
    const [loadedAccount, setLoadedAccount] = useState<AllocationAccount>();
    const [open, setOpen] = useState(false);
    const [pendingEnable, setPendingEnable] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [draft, setDraft] = useState<AllocationConfig>({});
    const account = contextAccount || loadedAccount;
    const stageConfig = account?.stageAllocation?.[STAGE_KEYS[stage]];
    const stageAllocationEnabled = !!stageConfig?.enabled;
    const t = I18N.carbonFootprint3;
    const values = form.values as Values;
    const value = values.allocation || {
      enabled: false,
      rule: 0,
      method: 1,
    };
    useEffect(() => {
      if (!enabled || contextAccount || !accountId) return;
      let active = true;
      request<{ data: AllocationAccount }>({
        method: 'GET',
        url: '/footprint3/account/info',
        params: { id: accountId },
      })
        .then(response => {
          if (active) setLoadedAccount(response.data.data);
        })
        .catch(() => {
          if (active) {
            setLoadFailed(true);
            message.error(t.task1LoadFailed);
          }
        });
      return () => {
        active = false;
      };
    }, [enabled, contextAccount, accountId]);
    useEffect(() => {
      if (!enabled) return;
      if (!form.values.allocation && (account || !accountId))
        form.setValuesIn('allocation', {
          ...(isNew ? stageConfig : undefined),
          enabled: isNew ? !!stageConfig?.enabled : false,
          rule: 0,
          method: 1,
        });
      const id = 'quick-allocation';
      form.addEffects(id, () =>
        onFormValuesChange(() => installCalculation(form, stageConfig)),
      );
      installCalculation(form, stageConfig);
      return () => form.removeEffects(id);
    }, [enabled, form, stageConfig, isNew, account, accountId]);
    if (!enabled) return null;
    const update = (patch: Partial<AllocationConfig>) =>
      form.setValuesIn('allocation', { ...value, ...patch });
    const effective = value.rule === 1 ? value : stageConfig;
    const draftEffective = draft.rule === 1 ? draft : stageConfig;
    // 阶段关闭时不复制阶段的旧参与量，只恢复排放源已有的自定义草稿。
    const createDraft = (): AllocationConfig =>
      stageAllocationEnabled || value.rule === 1
        ? { ...value }
        : {
            enabled: true,
            rule: 1,
            method: 1,
            unitCode: account?.unitCode,
            unitName: account?.unitName,
          };
    // 每次打开从当前表单取草稿，取消或关闭不写回分配设置。
    const changeOpen = (next: boolean) => {
      if (next) setDraft(createDraft());
      if (!next) setPendingEnable(false);
      setOpen(next);
    };
    // 阶段关闭时先编辑草稿，确认前不启用分配或参与消耗数量计算。
    const changeEnabled = (checked: boolean) => {
      if (checked && !stageAllocationEnabled) {
        setDraft({ ...createDraft(), enabled: true, rule: 1 });
        setPendingEnable(true);
        setOpen(true);
        return;
      }
      update({ enabled: checked });
      if (!checked) changeOpen(false);
    };
    // 必填校验通过后一次写回配置及开启状态。
    const confirm = () => {
      if (form.readPretty) return;
      const next = {
        ...draft,
        enabled: pendingEnable || value.enabled,
        rule: stageAllocationEnabled ? draft.rule : 1,
      };
      if (next.rule === 1) {
        next.method = next.method ?? 1;
        if (next.method === 1) {
          next.unitCode = account?.unitCode || next.unitCode;
          next.unitName = account?.unitName || next.unitName;
        }
        if (!isAllocationValid(next)) {
          message.error(t.task1InvalidAllocation);
          return;
        }
      }
      form.setValuesIn('allocation', next);
      changeOpen(false);
    };
    return (
      <div className={styles.allocation} lang={locale}>
        <div className={styles.controlLabel}>
          <span className={styles.labelWithIcon}>
            {t.task1ApplyAllocation}
            <Tooltip title={t.task1ApplyAllocationHint}>
              <img src={infoIcon} alt='' />
            </Tooltip>
          </span>
          {value.enabled && (
            <button
              type='button'
              disabled={form.readPretty}
              className={styles.textButton}
              onClick={() => changeOpen(true)}
            >
              <img src={configureIcon} alt='' />
              {t.task1Configure}
            </button>
          )}
        </div>
        <div className={styles.controlBody}>
          <Switch
            size='small'
            checked={!!value.enabled}
            disabled={
              form.readPretty || loadFailed || (!!accountId && !account)
            }
            onChange={changeEnabled}
          />
          {(value.enabled || open) && (
            <Popover
              trigger='click'
              placement='bottomRight'
              arrow={false}
              open={open}
              onOpenChange={changeOpen}
              overlayClassName={`${styles.allocationPopover} ${
                locale === LocaleType.enUS ? styles.allocationPopoverEn : ''
              }`}
              content={
                <div className={styles.popover} lang={locale}>
                  <div className={styles.popoverHeader}>
                    <strong>{t.task1AllocationConfig}</strong>
                    <button
                      type='button'
                      className={styles.popoverClose}
                      aria-label={t.close}
                      onClick={() => changeOpen(false)}
                    >
                      <img src={consumptionCloseIcon} alt='' />
                    </button>
                  </div>
                  <div className={styles.rules} role='tablist'>
                    <Button
                      role='tab'
                      aria-selected={draft.rule !== 1}
                      disabled={form.readPretty || !stageAllocationEnabled}
                      onClick={() => setDraft({ ...draft, rule: 0 })}
                    >
                      {t.task1InheritStage}
                    </Button>
                    <Button
                      role='tab'
                      aria-selected={draft.rule === 1}
                      disabled={form.readPretty}
                      onClick={() => {
                        if (draft.rule === 1) return;
                        setDraft({
                          ...stageConfig,
                          enabled: true,
                          rule: 1,
                        });
                      }}
                    >
                      {t.task1CustomAllocation}
                    </Button>
                  </div>
                  <AllocationEditor
                    compact
                    value={
                      draft.rule === 1
                        ? { ...draftEffective, enabled: true }
                        : { ...draftEffective }
                    }
                    readOnly={form.readPretty || draft.rule !== 1}
                    physicalUnitCode={account?.unitCode}
                    physicalUnitName={account?.unitName}
                    onChange={next => setDraft({ ...next, rule: 1 })}
                  />
                  <div className={styles.popoverFooter}>
                    <Button onClick={() => changeOpen(false)}>
                      {I18N.carbonFootprint.cancel}
                    </Button>
                    <Button
                      type='primary'
                      disabled={form.readPretty}
                      onClick={confirm}
                    >
                      {I18N.carbonFootprint.confirm}
                    </Button>
                  </div>
                </div>
              }
            >
              <button
                type='button'
                className={styles.ruleSummary}
                lang={locale}
              >
                <span>
                  <span className={styles.summaryLabel}>
                    {t.task1AllocationRule}：
                  </span>
                  {(pendingEnable ? draft.rule : value.rule) === 1
                    ? t.task1CustomAllocation
                    : t.task1InheritStage}
                </span>
                <span>
                  <span className={styles.summaryLabel}>
                    {t.task1AllocationRatio}：
                  </span>
                  {allocationPercentage(pendingEnable ? draft : effective) ||
                    '-'}
                  %
                </span>
              </button>
            </Popover>
          )}
        </div>
      </div>
    );
  },
);

/** 详细信息默认折叠；温室气体字段由原schema作为children移入，保留原有GWP交互。 */
export const EmissionDetails = observer(
  ({ children }: { children?: React.ReactNode }) => {
    const form = useForm();
    const values = form.values as Values;
    const t = I18N.carbonFootprint3;
    const id = useId();
    const materials = [1, 2, 3, 4].includes(Number(values.type));
    const wastes = wasteTypes.includes(Number(values.type));
    const textField = (key: string, title: string, maxLength: number) => (
      <label
        className={`${styles.field} ${
          key === 'detailRemark' ? styles.fullWidth : ''
        }`}
        key={key}
        htmlFor={id + key}
      >
        <span>{title}</span>
        <Input
          id={id + key}
          disabled={form.readPretty}
          maxLength={maxLength}
          placeholder={t.pleaseEnter}
          value={form.getValuesIn(key) || ''}
          onChange={event => form.setValuesIn(key, event.target.value)}
        />
      </label>
    );
    return (
      <Collapse
        ghost
        className={styles.details}
        expandIcon={({ isActive }) => (
          <img
            className={isActive ? styles.detailArrow : styles.detailArrowClosed}
            src={isActive ? detailsOpenIcon : detailsClosedIcon}
            alt=''
          />
        )}
        items={[
          {
            key: 'details',
            label: t.task1Details,
            children: (
              <div className={styles.grid}>
                <div className={styles.gasField}>{children}</div>
                {materials && textField('material', t.task1Material, 40)}
                {materials && (
                  <label className={styles.field} htmlFor={`${id}-loss`}>
                    <span className={styles.labelWithIcon}>
                      {t.task1Loss}
                      <Tooltip title={t.task1LossHint}>
                        <img src={infoIcon} alt='' />
                      </Tooltip>
                    </span>
                    <InputNumber
                      id={`${id}-loss`}
                      stringMode
                      controls={false}
                      placeholder={t.pleaseEnter}
                      addonAfter='%'
                      disabled={form.readPretty}
                      min='0'
                      max='99.99'
                      precision={2}
                      value={values.lossRate}
                      onChange={loss =>
                        form.setValuesIn(
                          'lossRate',
                          loss === null ? '' : String(loss),
                        )
                      }
                    />
                  </label>
                )}
                {materials && textField('supplierName', t.supplier, 40)}
                {wastes && textField('treatmentMethod', t.task1Treatment, 40)}
                {wastes && (
                  <label className={styles.field} htmlFor={`${id}-disposal`}>
                    <span>{t.task1DisposalRatio}</span>
                    <InputNumber
                      id={`${id}-disposal`}
                      stringMode
                      controls={false}
                      placeholder={t.pleaseEnter}
                      addonAfter='%'
                      disabled={form.readPretty}
                      min='0'
                      max='100'
                      precision={2}
                      value={form.getValuesIn('disposalRate')}
                      onChange={ratio =>
                        form.setValuesIn(
                          'disposalRate',
                          ratio === null ? '' : String(ratio),
                        )
                      }
                    />
                    <small>{t.task1DisposalHint}</small>
                  </label>
                )}
                {textField('detailRemark', t.task1Remark, 255)}
              </div>
            ),
          },
        ]}
      />
    );
  },
);

/** 路段详细字段共用的默认折叠容器。 */
export const TransportDetails = ({
  children,
}: {
  children?: React.ReactNode;
}) => (
  <Collapse
    ghost
    className={`${styles.details} ${styles.transportDetails}`}
    expandIcon={({ isActive }) => (
      <img
        className={isActive ? styles.detailArrow : styles.detailArrowClosed}
        src={isActive ? detailsOpenIcon : detailsClosedIcon}
        alt=''
      />
    )}
    items={[
      {
        key: 'details',
        label: I18N.carbonFootprint3.task1Details,
        // 默认收起仍挂载表单字段，确保车型/燃料回显和因子联动可读取。
        forceRender: true,
        children,
      },
    ]}
  />
);

/** 能耗路段显示独立D，数量输入仍保留A；与主排放源共用计算详情样式。 */
export const TransportEnergyLabel = observer(() => {
  const form = useForm();
  const field = useField();
  const [open, setOpen] = useState(false);
  const account = useContext(AllocationAccountContext);
  const { locale } = useContext(LocaleContext);
  const values = form.values as Values;
  const match = field.address
    .toString()
    .match(/accountEmissionTransportList\.(\d+)/);
  const route = match
    ? values.accountEmissionTransportList?.[Number(match[1])]
    : undefined;
  const t = I18N.carbonFootprint3;
  const title = I18N.carbonFootprint.quantityUnit;
  if (!route) return <span>{title}</span>;
  const result = route.unitAmount
    ? new BigNumber(route.unitAmount).toFixed()
    : '-';
  const raw = route.quantity ?? route.amount;
  const selectedUnit = route.factorObjUnitString || route.unitName || '';
  const unit = selectedUnit === '-' ? '' : selectedUnit;
  const resultUnit =
    unit && account?.unitName ? `${unit}/${account.unitName}` : unit;
  const config =
    values.allocation?.enabled && values.allocation.rule !== 1
      ? account?.stageAllocation?.[STAGE_KEYS[Number(form.values.stage || 0)]]
      : values.allocation;
  const percentage = allocationPercentage(config);
  const coefficient = percentage
    ? new BigNumber(percentage).dividedBy(100).toFixed()
    : '-';
  const hasLoss =
    [1, 2, 3, 4].includes(Number(values.type)) && !!values.lossRate;
  return (
    <span
      className={`${styles.amountLabel} ${styles.energyAmountLabel}`}
      lang={locale}
    >
      {title}
      <Popover
        trigger='click'
        placement='topRight'
        arrow={false}
        open={open}
        onOpenChange={setOpen}
        overlayClassName={styles.consumptionPopover}
        content={
          <div className={styles.consumptionContent}>
            <div className={styles.consumptionHeader}>
              {t.task1UnitConsumption}
            </div>
            <div className={styles.consumptionResult}>
              {result} {resultUnit}
            </div>
            <div className={styles.consumptionRows}>
              <div>
                <span>{title}</span>
                <span>
                  {raw ?? '-'} {unit}
                </span>
              </div>
              <div>
                <span>{t.task1AllocationRatio}</span>
                <span>{coefficient}</span>
              </div>
              {hasLoss && (
                <div>
                  <span>{t.task1Loss}</span>
                  <span>{values.lossRate}%</span>
                </div>
              )}
            </div>
            <div className={styles.formula}>
              {raw ?? '-'} {unit} × {coefficient}
              {hasLoss && ` ÷ (1 − ${values.lossRate}%)`} = {result}{' '}
              {resultUnit}
            </div>
          </div>
        }
      >
        <button
          type='button'
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            setOpen(!open);
          }}
          className={`${styles.textButton} ${styles.consumptionTrigger}`}
        >
          {t.task1UnitProduct}：{result} {resultUnit}
        </button>
      </Popover>
    </span>
  );
});
