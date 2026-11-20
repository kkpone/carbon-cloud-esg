import { SearchOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import {
  Button,
  Empty,
  Input,
  Modal,
  Select,
  Table,
  TableColumnsType,
  Tag,
  Tooltip,
} from 'antd';
import classNames from 'classnames';
import { debounce, isNil } from 'lodash-es';
import { FC, useEffect, useMemo, useState } from 'react';

import ExpandIcon from '@/components/ExpandIcon';
import AcIndicatorTag from '@/views/ESG/components/AcIndicatorTag';
import { getFilterStandardList } from '@/views/ESG/Management/service';
import { getSummaryList } from '@/views/ESG/Summary/service';
import { INDICATOR_TYPE_LABEL } from '@/views/ESG/constant';
import { Indicator } from '@/views/ESG/type';
import {
  isGroupIndicator,
  isLeafIndicator,
  isModelIndicator,
} from '@/views/ESG/utils';

import styles from './index.module.less';
import { SectionIndicatorRef } from '../../service';

export interface ISectionIndicatorModalProps {
  open: boolean;
  sectionTitle: string;
  frameId?: number | string | null;
  indicatorType?: 0 | 1;
  value: SectionIndicatorRef[];
  onCancel: () => void;
  onConfirm: (indicators: SectionIndicatorRef[]) => void;
}

const flattenLeaves = (nodes: Indicator[]): Indicator[] => {
  const result: Indicator[] = [];
  const visit = (list?: Indicator[]) => {
    list?.forEach(item => {
      if (isLeafIndicator(item)) {
        result.push(item);
      }
      if (item.children?.length) {
        visit(item.children);
      }
    });
  };
  visit(nodes);
  return result;
};

const filterTreeWithValue = (
  nodes: Indicator[],
  onlyWithValue: boolean,
): Indicator[] => {
  if (!onlyWithValue) {
    return nodes;
  }
  return nodes.reduce<Indicator[]>((acc, node) => {
    const filteredChildren = filterTreeWithValue(
      node.children || [],
      onlyWithValue,
    );
    const hasSelfValue =
      isLeafIndicator(node) &&
      !isNil(node.indicatorValue) &&
      String(node.indicatorValue).trim() !== '';
    if (hasSelfValue || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren,
      });
    }
    return acc;
  }, []);
};

const collectGroupKeys = (nodes: Indicator[]): string[] => {
  const keys: string[] = [];
  const visit = (list?: Indicator[]) => {
    list?.forEach(item => {
      if (item.children?.length) {
        keys.push(String(item.id));
        visit(item.children);
      }
    });
  };
  visit(nodes);
  return keys;
};

export const SectionIndicatorModal: FC<ISectionIndicatorModalProps> = ({
  open,
  sectionTitle,
  frameId,
  indicatorType = 0,
  value,
  onCancel,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState<Indicator[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [standardList, setStandardList] = useState<
    { id: number; name: string }[]
  >([]);
  const [searchParams, setSearchParams] = useState<{
    name?: string;
    standardIds?: string;
  }>({});
  const [onlyWithValue, setOnlyWithValue] = useState(false);
  const [selectedMap, setSelectedMap] = useState<
    Map<string, SectionIndicatorRef>
  >(new Map());

  const numericFrameId = frameId ? Number(frameId) : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }
    const nextMap = new Map<string, SectionIndicatorRef>();
    value.forEach(item => {
      nextMap.set(String(item.indicatorId), item);
    });
    setSelectedMap(nextMap);
  }, [open, value]);

  useEffect(() => {
    if (!open || !numericFrameId) {
      return;
    }
    getFilterStandardList({ frameId: numericFrameId })
      .then(({ data }) => {
        setStandardList(data.data || []);
      })
      .catch(() => {
        setStandardList([]);
      });
  }, [open, numericFrameId]);

  useEffect(() => {
    if (!open || !numericFrameId) {
      setTreeData([]);
      return;
    }
    setLoading(true);
    getSummaryList({
      frameId: numericFrameId,
      name: searchParams.name,
      standardIds: searchParams.standardIds,
    })
      .then(({ data }) => {
        const list = data?.data?.dataTree || [];
        setTreeData(list);
        setExpandedRowKeys(collectGroupKeys(list));
      })
      .catch(() => {
        setTreeData([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, numericFrameId, searchParams]);

  const visibleTree = useMemo(
    () => filterTreeWithValue(treeData, onlyWithValue),
    [treeData, onlyWithValue],
  );

  const onNameSearch = useMemo(
    () =>
      debounce((name: string) => {
        setSearchParams(prev => ({
          ...prev,
          name: name.trim() || undefined,
        }));
      }, 300),
    [],
  );

  useEffect(() => () => onNameSearch.cancel(), [onNameSearch]);

  const columns: TableColumnsType<Indicator> = [
    {
      title: I18N.esg.allIndicators,
      dataIndex: 'name',
      width: 280,
      ellipsis: true,
      render: (_, record) => {
        const { level, name, id, children } = record;
        const expanded = expandedRowKeys.includes(String(id));
        return (
          <div className={styles.tableNameColumn}>
            {!isModelIndicator(record) && (
              <div className={styles.tableLineContent}>
                {Array.from(
                  { length: Math.max(0, level - 1) },
                  (_item, lineIdx) => lineIdx + 1,
                ).map(lineLevel => (
                  <div
                    key={`${id}-line-${lineLevel}`}
                    className={styles.tableLine}
                  />
                ))}
              </div>
            )}
            {(children || []).length > 0 ? (
              <ExpandIcon
                expanded={expanded}
                onClick={() =>
                  setExpandedRowKeys(prev =>
                    expanded
                      ? prev.filter(key => key !== String(id))
                      : [...prev, String(id)],
                  )
                }
              />
            ) : (
              <div className={styles.emptyExpandIcon} />
            )}
            <div
              className={classNames(styles.groupName, {
                [styles.indicatorName]: !isGroupIndicator(record),
              })}
              title={name}
            >
              {name}
            </div>
            <AcIndicatorTag indicator={record} />
          </div>
        );
      },
    },
    {
      title: I18N.carbonFootprint.type,
      dataIndex: 'indicatorType',
      width: 100,
      render: (_, indicator) =>
        isGroupIndicator(indicator) ? null : (
          <div className={styles.nature}>
            {INDICATOR_TYPE_LABEL[indicator.indicatorType] || '-'}
          </div>
        ),
    },
    {
      title: I18N.esg.summaryData,
      dataIndex: 'indicatorValue',
      width: 130,
      render: (_, indicator) => {
        if (isGroupIndicator(indicator)) {
          return null;
        }
        const { indicatorValue, unitName } = indicator;
        if (isNil(indicatorValue) || String(indicatorValue).trim() === '') {
          return '-';
        }
        return (
          <span>
            <span className={styles.valueText}>{indicatorValue}</span>
            {unitName && <span className={styles.unitText}>{unitName}</span>}
          </span>
        );
      },
    },
    {
      title: I18N.esg.referenceStandards,
      dataIndex: 'standardStr',
      width: 180,
      render: (_, indicator) => {
        if (isGroupIndicator(indicator)) {
          return null;
        }
        const { standardStr } = indicator;
        if (!standardStr) {
          return '-';
        }
        const [first, ...rest] = standardStr.split(',');
        return (
          <div className={styles.column}>
            <div className={styles.tag} title={first}>
              {first}
            </div>
            {rest.length > 0 && (
              <Tooltip title={rest.join('，')}>
                <div className={styles.tag}>+{rest.length}</div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  const selectedRowKeys = Array.from(selectedMap.keys());

  const toIndicatorRef = (indicator: Indicator): SectionIndicatorRef => ({
    indicatorId: indicator.id,
    code: indicator.code,
    name: indicator.name,
    unitName: indicator.unitName,
    indicatorValue: indicator.indicatorValue,
    standardStr: indicator.standardStr,
    sourceType: indicatorType,
  });

  return (
    <Modal
      className={styles.sectionIndicatorModal}
      title={`${I18N.esg.selectSectionIndicators} - ${sectionTitle}`}
      width={960}
      open={open}
      destroyOnClose
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        {!numericFrameId && (
          <div className={styles.tipBanner}>
            {indicatorType === 1
              ? I18N.esg.uploadedExcelIndicatorModeTip
              : I18N.esg.noAvailableIndicatorsTip}
          </div>
        )}
        {numericFrameId && (
          <div className={styles.searchHeader}>
            <Input
              className={styles.searchField}
              allowClear
              prefix={<SearchOutlined />}
              placeholder={I18N.esg.searchIndicatorName}
              onChange={e => onNameSearch(e.target.value)}
            />
            <Select
              className={styles.searchField}
              mode='multiple'
              allowClear
              placeholder={I18N.esg.referenceStandards}
              options={standardList}
              fieldNames={{ value: 'id', label: 'name' }}
              onChange={(vals: number[]) =>
                setSearchParams(prev => ({
                  ...prev,
                  standardIds: vals.length ? vals.join(',') : undefined,
                }))
              }
            />
            <Select
              style={{ width: 140 }}
              value={onlyWithValue ? 'filled' : 'all'}
              onChange={val => setOnlyWithValue(val === 'filled')}
              options={[
                { label: I18N.esg.allIndicatorsFilter, value: 'all' },
                { label: I18N.esg.hasReportValue, value: 'filled' },
              ]}
            />
            <span className={styles.selectedSummary}>
              {I18N.template(I18N.esg.selectedIndicatorsCount, {
                val1: selectedMap.size,
              })}
            </span>
          </div>
        )}
        {selectedMap.size > 0 && (
          <div className={styles.column}>
            {Array.from(selectedMap.values()).map(item => (
              <Tag
                key={String(item.indicatorId)}
                closable
                color='cyan'
                onClose={() => {
                  setSelectedMap(prev => {
                    const next = new Map(prev);
                    next.delete(String(item.indicatorId));
                    return next;
                  });
                }}
              >
                {item.name}
                {!isNil(item.indicatorValue) &&
                String(item.indicatorValue).trim() !== ''
                  ? ` (${item.indicatorValue}${item.unitName || ''})`
                  : ''}
              </Tag>
            ))}
          </div>
        )}
        {numericFrameId ? (
          <Table
            className={styles.indicatorTable}
            rowKey={record => String(record.id)}
            columns={columns}
            dataSource={visibleTree}
            loading={loading}
            pagination={false}
            scroll={{ x: 740, y: 400 }}
            expandable={{
              expandedRowKeys,
              indentSize: 0,
              expandIcon: () => null,
            }}
            rowSelection={{
              columnWidth: 36,
              checkStrictly: false,
              selectedRowKeys,
              onSelect: (record, selected) => {
                const leaves = isLeafIndicator(record)
                  ? [record]
                  : flattenLeaves(record.children || []);
                setSelectedMap(prev => {
                  const next = new Map(prev);
                  leaves.forEach(leaf => {
                    const key = String(leaf.id);
                    if (selected) {
                      next.set(key, toIndicatorRef(leaf));
                    } else {
                      next.delete(key);
                    }
                  });
                  return next;
                });
              },
              onSelectAll: (selected, _, changeRows) => {
                const leaves = changeRows.filter(isLeafIndicator);
                setSelectedMap(prev => {
                  const next = new Map(prev);
                  leaves.forEach(leaf => {
                    const key = String(leaf.id);
                    if (selected) {
                      next.set(key, toIndicatorRef(leaf));
                    } else {
                      next.delete(key);
                    }
                  });
                  return next;
                });
              },
            }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
      <div className={styles.footer}>
        <Button onClick={onCancel}>{I18N.carbonFootprint.cancel}</Button>
        <Button
          type='primary'
          onClick={() => {
            onConfirm(Array.from(selectedMap.values()));
            onCancel();
          }}
        >
          {I18N.carbonFootprint.confirm2}
        </Button>
      </div>
    </Modal>
  );
};
