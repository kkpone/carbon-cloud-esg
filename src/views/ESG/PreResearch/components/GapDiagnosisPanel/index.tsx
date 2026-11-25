import {
  DownloadOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Checkbox, Input, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FC, useMemo, useState } from 'react';

import styles from './index.module.less';
import { exportGapDiagnosisExcel } from '../../exportUtils';
import {
  EsgPillar,
  GapClientStatus,
  GapDiagnosisItem,
  GapPriority,
  PreResearchProject,
} from '../../types';

export interface IGapDiagnosisPanelProps {
  project: PreResearchProject;
  onChange: (items: GapDiagnosisItem[]) => void;
  onRegenerate: () => void;
  generating: boolean;
}

const PILLAR_COLOR: Record<EsgPillar, string> = {
  E: 'green',
  S: 'blue',
  G: 'purple',
};
const PRIORITY_COLOR: Record<GapPriority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'default',
};

export const GapDiagnosisPanel: FC<IGapDiagnosisPanelProps> = ({
  project,
  onChange,
  onRegenerate,
  generating,
}) => {
  const [pillarFilter, setPillarFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const items = project.gapItems;

  const stats = useMemo(() => {
    const total = items.length;
    const p0 = items.filter(i => i.priority === 'P0').length;
    const p1 = items.filter(i => i.priority === 'P1').length;
    const compliant = items.filter(i => i.client_status === 'compliant').length;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;
    return { total, p0, p1, rate };
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        if (pillarFilter !== 'ALL' && item.esg_pillar !== pillarFilter)
          return false;
        if (statusFilter !== 'ALL' && item.client_status !== statusFilter)
          return false;
        if (priorityFilter !== 'ALL' && item.priority !== priorityFilter)
          return false;
        return true;
      }),
    [items, pillarFilter, statusFilter, priorityFilter],
  );

  const updateRow = <K extends keyof GapDiagnosisItem>(
    gapId: string,
    field: K,
    val: GapDiagnosisItem[K],
  ) => {
    onChange(
      items.map(item =>
        item.gap_id === gapId ? { ...item, [field]: val } : item,
      ),
    );
  };

  const handleAddRow = () => {
    const nextIndex = items.length + 1;
    const nextItem: GapDiagnosisItem = {
      gap_id: `GAP-E-${String(nextIndex).padStart(2, '0')}`,
      esg_pillar: 'E',
      topic_name: '新增合规诊断议题',
      standard_source: project.standards[0] || 'GRI Standards',
      requirement_type: '建议披露',
      requirement_detail: '请填写具体披露要求（原子项）',
      client_status: 'missing',
      evidence_ref: '上年报告未提及',
      gap_description: '待补充差距分析',
      priority: 'P1',
      action_suggestion: '访谈对应部门补充台账与制度依据',
      owner_dept: project.departments[0]?.deptName || 'EHS安环部',
      selectedForInterview: true,
    };
    onChange([nextItem, ...items]);
  };

  const columns: ColumnsType<GapDiagnosisItem> = [
    {
      title: 'gap_id',
      dataIndex: 'gap_id',
      width: 130,
      fixed: 'left',
      render: (_, record) => (
        <div className={styles.idCell}>
          <span className={styles.gapCode}>{record.gap_id}</span>
          <div className={styles.tagRow}>
            <Tag color={PILLAR_COLOR[record.esg_pillar]}>
              {record.esg_pillar}
            </Tag>
            <Tag color={PRIORITY_COLOR[record.priority]}>{record.priority}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: I18N.esg.topicName,
      dataIndex: 'topic_name',
      width: 160,
      render: (_, record) => (
        <div>
          <div className={styles.topicName}>{record.topic_name}</div>
          <div className={styles.subText}>{record.standard_source}</div>
          <Tag style={{ marginTop: 4 }}>{record.requirement_type}</Tag>
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchFilterStatus,
      dataIndex: 'client_status',
      width: 120,
      render: (_, record) => (
        <Select<GapClientStatus>
          size='small'
          style={{ width: '100%' }}
          value={record.client_status}
          options={[
            { label: I18N.esg.preResearchStatusCompliant, value: 'compliant' },
            { label: I18N.esg.preResearchStatusPartial, value: 'partial' },
            { label: I18N.esg.preResearchStatusMissing, value: 'missing' },
            { label: I18N.esg.preResearchStatusNa, value: 'not_applicable' },
          ]}
          onChange={v => updateRow(record.gap_id, 'client_status', v)}
        />
      ),
    },
    {
      title: I18N.esg.preResearchFilterPriority,
      dataIndex: 'priority',
      width: 96,
      render: (_, record) => (
        <Select<GapPriority>
          size='small'
          style={{ width: '100%' }}
          value={record.priority}
          options={[
            { label: 'P0', value: 'P0' },
            { label: 'P1', value: 'P1' },
            { label: 'P2', value: 'P2' },
          ]}
          onChange={v => updateRow(record.gap_id, 'priority', v)}
        />
      ),
    },
    {
      title: I18N.esg.preResearchTabGap,
      dataIndex: 'gap_description',
      width: 340,
      render: (_, record) => (
        <div className={styles.descCell}>
          <div className={styles.reqText}>{record.requirement_detail}</div>
          <div className={styles.evidenceBox}>{record.evidence_ref}</div>
          <Input.TextArea
            size='small'
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={record.gap_description}
            onChange={e =>
              updateRow(record.gap_id, 'gap_description', e.target.value)
            }
          />
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchDeptListTitle,
      dataIndex: 'owner_dept',
      width: 240,
      render: (_, record) => (
        <div className={styles.descCell}>
          <Input
            size='small'
            value={record.owner_dept}
            onChange={e =>
              updateRow(record.gap_id, 'owner_dept', e.target.value)
            }
          />
          <Input.TextArea
            size='small'
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={record.action_suggestion}
            onChange={e =>
              updateRow(record.gap_id, 'action_suggestion', e.target.value)
            }
          />
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchTabInterview,
      dataIndex: 'selectedForInterview',
      width: 110,
      render: (_, record) => (
        <Checkbox
          checked={record.selectedForInterview}
          onChange={e =>
            updateRow(record.gap_id, 'selectedForInterview', e.target.checked)
          }
        />
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{I18N.esg.preResearchGapTotal}</div>
          <div className={styles.kpiValue}>{stats.total}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{I18N.esg.preResearchGapP0}</div>
          <div className={styles.kpiValueDanger}>{stats.p0}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>{I18N.esg.preResearchGapP1}</div>
          <div className={styles.kpiValueWarn}>{stats.p1}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>
            {I18N.esg.preResearchGapCompliantRate}
          </div>
          <div className={styles.kpiValueSuccess}>{`${stats.rate}%`}</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Select
            value={pillarFilter}
            onChange={setPillarFilter}
            style={{ width: 130 }}
            options={[
              {
                label: `${I18N.esg.preResearchFilterPillar}: ${I18N.esg.preResearchFilterAll}`,
                value: 'ALL',
              },
              { label: 'E', value: 'E' },
              { label: 'S', value: 'S' },
              { label: 'G', value: 'G' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 150 }}
            options={[
              {
                label: `${I18N.esg.preResearchFilterStatus}: ${I18N.esg.preResearchFilterAll}`,
                value: 'ALL',
              },
              {
                label: I18N.esg.preResearchStatusCompliant,
                value: 'compliant',
              },
              { label: I18N.esg.preResearchStatusPartial, value: 'partial' },
              { label: I18N.esg.preResearchStatusMissing, value: 'missing' },
              { label: I18N.esg.preResearchStatusNa, value: 'not_applicable' },
            ]}
          />
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 130 }}
            options={[
              {
                label: `${I18N.esg.preResearchFilterPriority}: ${I18N.esg.preResearchFilterAll}`,
                value: 'ALL',
              },
              { label: 'P0', value: 'P0' },
              { label: 'P1', value: 'P1' },
              { label: 'P2', value: 'P2' },
            ]}
          />
        </div>
        <div className={styles.actions}>
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            {I18N.esg.preResearchAddGapItem}
          </Button>
          <Button
            icon={<SyncOutlined />}
            loading={generating}
            onClick={onRegenerate}
          >
            {I18N.esg.preResearchGenerateGap}
          </Button>
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={() => exportGapDiagnosisExcel(project, filteredItems)}
          >
            {I18N.esg.preResearchExportExcel}
          </Button>
        </div>
      </div>

      <Table
        rowKey='gap_id'
        columns={columns}
        dataSource={filteredItems}
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};
