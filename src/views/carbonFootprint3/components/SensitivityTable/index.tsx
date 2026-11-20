import {
  Button,
  Checkbox,
  Popover,
  Space,
  Table,
  Tooltip,
  message,
} from 'antd';
import classNames from 'classnames';
import type { TableRowSelection } from 'antd/es/table/interface';
import { useEffect, useState } from 'react';

import I18N from '@/lang/I18N';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { AnalysisIcon } from '../AnalysisIcon';

import styles from './index.module.less';
import { getSensitivityResults } from './service';
import { SensitivityItem } from './types';

interface Props {
  className?: string;
  tableClassName?: string;
  bordered?: boolean;
  accountId?: number | string;
  extra?: Record<string, unknown>;
  rows?: SensitivityItem[];
  showSensitivity?: boolean;
  showDataTypeFilter?: boolean;
  rowSelection?: TableRowSelection<SensitivityItem>;
}

export function SensitivityTable({
  className,
  tableClassName,
  bordered,
  accountId,
  extra,
  rows,
  showSensitivity = true,
  showDataTypeFilter = true,
  rowSelection,
}: Props) {
  const [loaded, setLoaded] = useState<SensitivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<string[]>(['activity', 'factor']);
  const [pendingTypes, setPendingTypes] = useState<string[]>(types);
  const [filterOpen, setFilterOpen] = useState(false);
  const context = JSON.stringify(extra ?? {});
  useEffect(() => {
    if (rows || accountId === undefined) return undefined;
    let cancelled = false;
    setLoaded([]);
    setLoading(true);
    getSensitivityResults(
      accountId,
      JSON.parse(context) as Record<string, unknown>,
    )
      .then(response => {
        if (!cancelled) setLoaded(response.data.data);
      })
      // 接口错误由统一请求层处理，页面只结束加载。
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, context, rows]);
  const labels = {
    activity: I18N.carbonFootprint3.sensitivityActivity,
    factor: I18N.carbonFootprint3.sensitivityFactor,
  };
  const renderText = (value: string) => <AnalysisText value={value || '-'} />;
  const allRows = rows ?? loaded;
  return (
    <div className={className ?? styles.wrapper}>
      <Table<SensitivityItem>
        className={classNames(styles.table, tableClassName)}
        bordered={bordered}
        rowKey='id'
        loading={loading}
        rowSelection={
          rowSelection ? { columnWidth: 48, ...rowSelection } : undefined
        }
        tableLayout='fixed'
        dataSource={
          showDataTypeFilter
            ? allRows.filter(row => types.includes(row.dataType))
            : allRows
        }
        pagination={{
          pageSize: 10,
          showSizeChanger: false,
          hideOnSinglePage: true,
        }}
        columns={[
          {
            title: (
              <AnalysisText
                value={I18N.carbonFootprint3.sensitivityStage}
                multiline
              />
            ),
            dataIndex: 'stageNames',
            width: '22%',
            render: renderText,
          },
          {
            title: (
              <AnalysisText
                value={I18N.carbonFootprint3.sensitivitySource}
                multiline
              />
            ),
            dataIndex: 'sourceNames',
            width: '34%',
            render: renderText,
          },
          ...(!showSensitivity
            ? [
                {
                  title: (
                    <AnalysisText
                      value={I18N.carbonFootprint3.sensitivitySourceType}
                      multiline
                    />
                  ),
                  dataIndex: 'sourceTypes',
                  width: '22%',
                  render: renderText,
                },
              ]
            : []),
          {
            title: (
              <Space className={styles.columnTitle}>
                <AnalysisText
                  value={I18N.carbonFootprint3.sensitivityDataType}
                  multiline
                />
                {showDataTypeFilter && (
                  <Popover
                    trigger='click'
                    open={filterOpen}
                    onOpenChange={open => {
                      setPendingTypes(types);
                      setFilterOpen(open);
                    }}
                    content={
                      <Space
                        direction='vertical'
                        className={styles.filterContent}
                      >
                        <Checkbox.Group
                          value={pendingTypes}
                          onChange={values =>
                            setPendingTypes(values.map(String))
                          }
                          options={Object.entries(labels).map(
                            ([value, label]) => ({ value, label }),
                          )}
                        />
                        <Space>
                          <Button
                            size='small'
                            onClick={() => setFilterOpen(false)}
                          >
                            {I18N.carbonFootprint3.sensitivityCancel}
                          </Button>
                          <Button
                            size='small'
                            type='primary'
                            onClick={() => {
                              if (!pendingTypes.length) {
                                message.warning(
                                  I18N.carbonFootprint3.sensitivitySelectType,
                                );
                                return;
                              }
                              setTypes(pendingTypes);
                              setFilterOpen(false);
                            }}
                          >
                            {I18N.carbonFootprint3.sensitivityApply}
                          </Button>
                        </Space>
                      </Space>
                    }
                  >
                    <Button
                      type='text'
                      size='small'
                      className={
                        types.length === 1 ? styles.activeFilter : styles.filter
                      }
                      aria-label={I18N.carbonFootprint3.sensitivityDataType}
                      icon={<AnalysisIcon name='filter' />}
                    />
                  </Popover>
                )}
              </Space>
            ),
            dataIndex: 'dataTypeName',
            width: '22%',
            render: renderText,
          },
          ...(showSensitivity
            ? [
                {
                  title: (
                    <Space className={styles.columnTitle}>
                      <AnalysisText
                        value={I18N.carbonFootprint3.sensitivityValue}
                        multiline
                      />
                      <Tooltip title={I18N.carbonFootprint3.sensitivityTip}>
                        <span className={styles.helpIcon}>
                          <AnalysisIcon name='info' />
                        </span>
                      </Tooltip>
                    </Space>
                  ),
                  dataIndex: 'sensitivity',
                  width: '22%',
                  render: renderText,
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
