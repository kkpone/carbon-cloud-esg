import { renderSelectOption } from '../ReportSelect';
import { Button, Drawer, Input, Modal, Select, Space, Spin, Tabs } from 'antd';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import I18N from '@/lang/I18N';
import { AnalysisIcon } from '@/views/carbonFootprint3/components/AnalysisIcon';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { SensitivityTable } from '@/views/carbonFootprint3/components/SensitivityTable';
import {
  SensitivityConfig,
  SensitivityConfigs,
  SensitivityItem,
} from '@/views/carbonFootprint3/components/SensitivityTable/types';
import styles from './index.module.less';
import { getReportSensitivityResults } from './service';

export interface SensitivityProduct {
  accountId: number;
  name: string;
  functionalName?: string;
}
interface Props {
  reportId?: number;
  products: SensitivityProduct[];
  configs: SensitivityConfigs;
  onChange: Dispatch<SetStateAction<SensitivityConfigs>>;
  readOnly: boolean;
}

// 阶段、类型为系统枚举；拆分仅用于下拉选项和精确筛选。
const splitLabels = (value: string) => value.split('、').filter(Boolean);

export function ReportSensitivity({
  reportId,
  products,
  configs,
  onChange,
  readOnly,
}: Props) {
  const [active, setActive] = useState<string>();
  const [rows, setRows] = useState<SensitivityItem[]>();
  const [loading, setLoading] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [stage, setStage] = useState<string>();
  const [sourceType, setSourceType] = useState<string>();
  const [dataType, setDataType] = useState<string>();
  const key = products.some(p => String(p.accountId) === active)
    ? active
    : products[0]
    ? String(products[0].accountId)
    : undefined;
  const config: SensitivityConfig =
    key && configs[key] ? configs[key] : { scope: '0', description: '' };
  const loadedRows = rows ?? [];
  useEffect(() => {
    let cancelled = false;
    setRows(undefined);
    setLoading(false);
    if (!key) return undefined;
    setLoading(true);
    const requestedScope = config.scope;
    getReportSensitivityResults(key, requestedScope, reportId)
      .then(result => {
        if (cancelled) return;
        setRows(result.rows);
        onChange(current => {
          const previous = current[key] ?? { scope: '0', description: '' };
          if (
            previous.scope !== requestedScope ||
            previous.scope === result.sensitivityScope
          ) {
            return current;
          }
          return {
            ...current,
            [key]: { ...previous, scope: result.sensitivityScope },
          };
        });
      })
      // 接口错误由统一请求层处理，页面不记录接口失败状态。
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, reportId]);
  const update = (next: SensitivityConfig) => {
    if (key) onChange(current => ({ ...current, [key]: next }));
  };
  const included =
    config.scope === '0'
      ? loadedRows
      : loadedRows.filter(row => config.scope.split(',').includes(row.id));
  const filtered = loadedRows.filter(
    row =>
      (!name || row.sourceNames.includes(name)) &&
      (!stage || splitLabels(row.stageNames).includes(stage)) &&
      (!sourceType || splitLabels(row.sourceTypes).includes(sourceType)) &&
      (!dataType || row.dataType === dataType),
  );
  const stageOptions = Array.from(
    new Set(loadedRows.flatMap(row => splitLabels(row.stageNames))),
  ).map(value => ({ value, label: value }));
  const typeOptions = Array.from(
    new Set(loadedRows.flatMap(row => splitLabels(row.sourceTypes))),
  ).map(value => ({ value, label: value }));
  return (
    <div className={styles.wrapper}>
      <Tabs
        tabPosition='left'
        activeKey={key}
        onChange={value => {
          setActive(value);
          setScopeOpen(false);
          setDescriptionOpen(false);
        }}
        className={styles.products}
        items={products.map(p => ({
          key: String(p.accountId),
          label: <AnalysisText value={p.name} multiline />,
        }))}
      />
      <div className={styles.content}>
        <div className={styles.toolbar}>
          <span className={styles.count}>
            {I18N.template(I18N.carbonFootprint3.sensitivityIncluded, {
              val1: included.length,
              val2: loadedRows.length,
            })
              .split(/(\d+\/\d+)/)
              .map((part, index) =>
                index % 2 ? <strong key={part}>{part}</strong> : part,
              )}
          </span>
          {!readOnly && key && (
            <Space size={16} wrap>
              <Button
                icon={<AnalysisIcon name='description' />}
                onClick={() => {
                  setDescription(config.description);
                  setDescriptionOpen(true);
                }}
              >
                {I18N.carbonFootprint3.sensitivityDescriptionTitle}
              </Button>
              <Button
                type='primary'
                icon={<AnalysisIcon name='scope' />}
                disabled={loading || rows === undefined}
                onClick={() => {
                  setSelected(
                    config.scope === '0'
                      ? loadedRows.map(row => row.id)
                      : config.scope.split(',').filter(Boolean),
                  );
                  setName('');
                  setStage(undefined);
                  setSourceType(undefined);
                  setDataType(undefined);
                  setScopeOpen(true);
                }}
              >
                {I18N.carbonFootprint3.sensitivityScope}
              </Button>
            </Space>
          )}
        </div>
        <Spin spinning={loading}>
          <SensitivityTable rows={included} />
        </Spin>
      </div>
      <Drawer
        open={scopeOpen}
        width='min(960px, 100vw)'
        rootClassName={styles.scopeDrawer}
        closeIcon={<AnalysisIcon name='close' />}
        title={I18N.carbonFootprint3.sensitivityScope}
        onClose={() => setScopeOpen(false)}
        footer={
          <div className={styles.scopeFooter}>
            <span className={styles.count}>
              {loadedRows.filter(row => selected.includes(row.id)).length} /{' '}
              {loadedRows.length}
            </span>
            <Space size={16}>
              <Button onClick={() => setScopeOpen(false)}>
                {I18N.carbonFootprint3.sensitivityCancel}
              </Button>
              <Button
                type='primary'
                onClick={() => {
                  update({
                    ...config,
                    scope:
                      loadedRows.length > 0 &&
                      selected.length === loadedRows.length &&
                      loadedRows.every(row => selected.includes(row.id))
                        ? '0'
                        : selected.join(','),
                  });
                  setScopeOpen(false);
                }}
              >
                {I18N.carbonFootprint3.sensitivityApply}
              </Button>
            </Space>
          </div>
        }
      >
        <div className={styles.filters}>
          <Input
            suffix={<AnalysisIcon name='search' />}
            value={name}
            maxLength={40}
            placeholder={I18N.carbonFootprint3.sensitivitySource}
            onChange={event => setName(event.target.value)}
          />
          <Select
            title=''
            optionRender={renderSelectOption}
            value={stage}
            allowClear
            placeholder={I18N.carbonFootprint3.sensitivityStage}
            options={stageOptions}
            onChange={setStage}
          />
          <Select
            title=''
            optionRender={renderSelectOption}
            value={sourceType}
            allowClear
            placeholder={I18N.carbonFootprint3.sensitivitySourceType}
            options={typeOptions}
            onChange={setSourceType}
          />
          <Select
            title=''
            optionRender={renderSelectOption}
            value={dataType}
            allowClear
            placeholder={I18N.carbonFootprint3.sensitivityDataType}
            onChange={setDataType}
            options={[
              {
                value: 'activity',
                label: I18N.carbonFootprint3.sensitivityActivity,
              },
              {
                value: 'factor',
                label: I18N.carbonFootprint3.sensitivityFactor,
              },
            ]}
          />
        </div>
        <SensitivityTable
          rows={filtered}
          showSensitivity={false}
          showDataTypeFilter={false}
          rowSelection={{
            selectedRowKeys: selected,
            preserveSelectedRowKeys: true,
            onChange: values => setSelected(values.map(String)),
          }}
        />
      </Drawer>
      <Modal
        open={descriptionOpen}
        centered
        width={480}
        className={styles.descriptionModal}
        closeIcon={<AnalysisIcon name='close' />}
        title={I18N.carbonFootprint3.sensitivityDescriptionTitle}
        okText={I18N.carbonFootprint.confirm}
        cancelText={I18N.carbonFootprint3.sensitivityCancel}
        onCancel={() => setDescriptionOpen(false)}
        onOk={() => {
          update({ ...config, description });
          setDescriptionOpen(false);
        }}
      >
        <p>{products.find(p => String(p.accountId) === key)?.name}</p>
        <Input.TextArea
          value={description}
          onChange={event => setDescription(event.target.value)}
          maxLength={1000}
          showCount
          rows={6}
        />
      </Modal>
    </div>
  );
}
