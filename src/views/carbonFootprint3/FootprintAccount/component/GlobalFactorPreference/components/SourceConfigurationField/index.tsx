import { SettingOutlined } from '@ant-design/icons';
import { move } from '@dnd-kit/helpers';
import { DragDropProvider } from '@dnd-kit/react';
import I18N from '@src/lang/I18N';
import { Button, Tabs, Transfer } from 'antd';
import { useMemo, useRef, useState } from 'react';

import {
  QUICK_ACCOUNT_LIFE_CYCLE,
  QUICK_ACCOUNT_LIFE_CYCLE_LABEL,
} from '@/views/carbonFootprint3/constant';
import type { QuickAccountLifeCycleStage } from '@/views/carbonFootprint3/type';

import {
  preferenceStages,
  resolveSourceIdsByOptions,
} from '../../configuration';
import type {
  FactorDatabaseSourceOption,
  FactorSourceId,
  SourceConfiguration,
  GlobalFactorPreferencePlan,
} from '../../type';
import { SortableTransferItem } from '../SortableTransferItem';
import styles from './index.module.less';

type Props = {
  value?: FactorSourceId[];
  onChange?: (value: FactorSourceId[]) => void;
  stageEnabled: 0 | 1;
  stageSourceIds: SourceConfiguration['stageSourceIds'];
  stageSourceItems?: GlobalFactorPreferencePlan['stageSourceItems'];
  onConfigurationChange?: (value: Partial<SourceConfiguration>) => void;
  options: FactorDatabaseSourceOption[];
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

export function SourceConfigurationField({
  value = [],
  onChange,
  stageEnabled,
  stageSourceIds,
  stageSourceItems,
  onConfigurationChange,
  options,
  loading = false,
  disabled = false,
  readOnly = false,
}: Props) {
  const [activeStage, setActiveStage] = useState<QuickAccountLifeCycleStage>(
    QUICK_ACCOUNT_LIFE_CYCLE.MATERIAL,
  );
  const [dragging, setDragging] = useState(false);
  const beforeDrag = useRef<FactorSourceId[]>([]);
  const dataSource = useMemo(
    () => options.map(option => ({ key: option.id, title: option.name })),
    [options],
  );
  const configured =
    stageEnabled === 1 ? stageSourceIds[activeStage] ?? [] : value;
  const selected = readOnly
    ? configured
    : resolveSourceIdsByOptions(configured, options);
  const setSelected = (ids: FactorSourceId[]) => {
    if (stageEnabled === 1)
      onConfigurationChange?.({
        stageSourceIds: { ...stageSourceIds, [activeStage]: ids },
      });
    else onChange?.(ids);
  };
  return (
    <div
      className={`${styles.configuration} ${
        stageEnabled === 1 ? styles.stageConfiguration : ''
      }`}
      role='group'
      aria-label={I18N.carbonFootprint3.backgroundDatabaseSource}
    >
      {!readOnly && (
        <div className={styles.heading}>
          <span className={styles.label}>
            {stageEnabled === 0 && <span className={styles.required}>*</span>}
            {I18N.carbonFootprint3.backgroundDatabaseSource}
          </span>
          <Button
            type='link'
            className={`${styles.configureButton} ${
              stageEnabled === 1 ? styles.cancelConfiguration : ''
            }`}
            icon={<SettingOutlined />}
            disabled={disabled || dragging}
            onClick={() => {
              beforeDrag.current = [];
              onConfigurationChange?.({
                stageEnabled: stageEnabled === 0 ? 1 : 0,
              });
            }}
          >
            {stageEnabled === 0
              ? I18N.carbonFootprint3.configureSourcesByStage
              : I18N.carbonFootprint3.cancelSourcesByStage}
          </Button>
        </div>
      )}
      {stageEnabled === 1 && (
        <Tabs
          className={styles.stageTabs}
          activeKey={String(activeStage)}
          tabBarGutter={0}
          onChange={key => {
            beforeDrag.current = [];
            setActiveStage(Number(key) as QuickAccountLifeCycleStage);
          }}
          items={preferenceStages.map(stage => ({
            key: String(stage),
            label: (
              <span className={styles.stageLabel}>
                {QUICK_ACCOUNT_LIFE_CYCLE_LABEL()[stage]}
                <span className={styles.stageCount}>
                  {readOnly
                    ? (stageSourceIds[stage] ?? []).length
                    : resolveSourceIdsByOptions(
                        stageSourceIds[stage] ?? [],
                        options,
                      ).length}
                </span>
              </span>
            ),
            disabled: dragging || disabled,
          }))}
        />
      )}
      {readOnly ? (
        selected.length ? (
          <ol className={styles.readOnlySources}>
            {selected.map(id => (
              <li key={id}>
                {stageSourceItems?.[activeStage]?.find(
                  item => item.sourceMainId === id,
                )?.sourceName ??
                  options.find(option => option.id === id)?.name ??
                  String(id)}
              </li>
            ))}
          </ol>
        ) : (
          <span>{I18N.components.all}</span>
        )
      ) : (
        <DragDropProvider
          key={`${stageEnabled}:${activeStage}`}
          onDragStart={() => {
            beforeDrag.current = [...selected];
            setDragging(true);
          }}
          onDragOver={event => {
            const next = move(selected, event);
            if (next !== selected) setSelected(next);
          }}
          onDragEnd={event => {
            if (event.canceled) setSelected(beforeDrag.current);
            beforeDrag.current = [];
            setDragging(false);
          }}
        >
          <Transfer
            className={styles.transfer}
            dataSource={dataSource}
            targetKeys={selected}
            onChange={keys =>
              setSelected(
                keys.filter(
                  (key): key is FactorSourceId =>
                    typeof key === 'string' || typeof key === 'number',
                ),
              )
            }
            disabled={loading || disabled}
            showSearch
            titles={[
              I18N.carbonFootprint3.availableSources,
              I18N.carbonFootprint3.selectedSources,
            ]}
            filterOption={(input, item) =>
              String(item.title || '').includes(input)
            }
            render={item => {
              const index = selected.findIndex(id => id === item.key);
              return (
                <SortableTransferItem
                  id={item.key}
                  index={Math.max(index, 0)}
                  title={String(item.title || '')}
                  sortLabel={I18N.carbonFootprint3.sort}
                  sortable={index >= 0}
                  disabled={loading || disabled}
                />
              );
            }}
          />
        </DragDropProvider>
      )}
    </div>
  );
}
