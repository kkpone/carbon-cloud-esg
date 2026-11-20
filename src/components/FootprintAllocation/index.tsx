import { Button, Drawer, Switch, message } from 'antd';
import BigNumber from 'bignumber.js';
import { useState } from 'react';
import I18N from '@src/lang/I18N';
import { request } from '@/api/request';
import AllocationEditor from './components/AllocationEditor';
import { AllocationAccount, StageAllocationConfig, STAGE_KEYS } from './types';
import { isAllocationValid } from './calculation';
import styles from './index.module.less';
import allocationIcon from './assets/allocation.svg';
import closeIcon from './assets/close.svg';

interface Props {
  account: AllocationAccount;
  readOnly?: boolean;
  onSaved?: () => void;
}

/** 快速核算阶段配置入口，保存后由调用方刷新重算后的排放源及核算结果。 */
const StageAllocationButton = ({ account, readOnly, onSaved }: Props) => {
  const t = I18N.carbonFootprint3;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<StageAllocationConfig>({});
  const titles = [
    t.task1MaterialStage,
    t.task1ProductionStage,
    t.distributionAndStorage,
    t.task1UseStage,
    t.task1EndOfLife,
  ];
  const stages = account.scopeValue?.split(',').map(Number) ?? [0, 1, 2, 3, 4];
  const save = async () => {
    if (
      STAGE_KEYS.some(
        key => config[key]?.enabled && !isAllocationValid(config[key]),
      )
    ) {
      message.error(t.task1InvalidAllocation);
      return;
    }
    setSaving(true);
    try {
      await request({
        method: 'POST',
        url: '/footprint3/account/stageAllocation',
        data: { id: account.id, stageAllocation: config },
      });
      setOpen(false);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Button
        type='text'
        size='small'
        className={styles.trigger}
        icon={<img src={allocationIcon} alt='' />}
        disabled={readOnly}
        onClick={() => {
          setConfig(structuredClone(account.stageAllocation || {}));
          setOpen(true);
        }}
      >
        {t.task1AllocationConfig}
      </Button>
      <Drawer
        title={t.task1AllocationConfig}
        width={640}
        open={open}
        closable={false}
        extra={
          <Button
            type='text'
            className={styles.closeButton}
            aria-label={I18N.carbonFootPrintLCA.close}
            icon={<img src={closeIcon} alt='' />}
            onClick={() => setOpen(false)}
          />
        }
        onClose={() => setOpen(false)}
        rootClassName={styles.drawer}
        footer={
          <div className={styles.footer}>
            <Button onClick={() => setOpen(false)}>
              {I18N.carbonFootprint.cancel}
            </Button>
            <Button type='primary' loading={saving} onClick={save}>
              {I18N.carbonFootprint.confirm}
            </Button>
          </div>
        }
      >
        {STAGE_KEYS.map(
          (key, stage) =>
            stages.includes(stage) && (
              <section className={styles.section} key={key}>
                <div className={styles.heading}>
                  <strong>{titles[stage]}</strong>
                  <label htmlFor={`allocation-${key}`}>
                    {t.task1AllocationEnabled}
                    <Switch
                      size='small'
                      id={`allocation-${key}`}
                      checked={!!config[key]?.enabled}
                      onChange={enabled => {
                        const previous = config[key] || {};
                        setConfig({
                          ...config,
                          [key]: {
                            method: 1,
                            unitCode: account.unitCode,
                            unitName: account.unitName,
                            totalAmount: account.productAmount
                              ? new BigNumber(account.productAmount).toFixed(
                                  2,
                                  BigNumber.ROUND_HALF_UP,
                                )
                              : undefined,
                            currentAmount: account.amount
                              ? new BigNumber(account.amount).toFixed(
                                  2,
                                  BigNumber.ROUND_HALF_UP,
                                )
                              : undefined,
                            ...previous,
                            enabled,
                          },
                        });
                      }}
                    />
                  </label>
                </div>
                {config[key]?.enabled && (
                  <AllocationEditor
                    value={config[key]!}
                    physicalUnitCode={account.unitCode}
                    physicalUnitName={account.unitName}
                    onChange={value => setConfig({ ...config, [key]: value })}
                  />
                )}
              </section>
            ),
        )}
      </Drawer>
    </>
  );
};
export default StageAllocationButton;
