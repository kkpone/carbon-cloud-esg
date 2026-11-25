import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Card, Input, Select, Table, Tag, Upload } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { FC, useState } from 'react';

import { Toast, uuid } from '@/utils';

import styles from './index.module.less';
import {
  DEFAULT_RATING_OPTIONS,
  DEFAULT_STANDARD_OPTIONS,
} from '../../mockService';
import { isEsgMockModeEnabled } from '../../../mockReportService';
import {
  DepartmentDutyItem,
  EsgPillar,
  PeerCompanyItem,
  PreResearchProject,
  UploadedMaterialItem,
} from '../../types';

export interface IInputMaterialsPanelProps {
  project: PreResearchProject;
  onChange: (next: PreResearchProject) => void;
  onGenerateAll?: () => void;
  generating: boolean;
  sections?: ('self' | 'reg' | 'peer' | 'dept' | 'clues')[];
}

const ACCEPT_FILES = '.pdf,.doc,.docx,.xlsx,.xls,.PDF,.DOC,.DOCX,.XLSX,.XLS';

export const InputMaterialsPanel: FC<IInputMaterialsPanelProps> = ({
  project,
  onChange,
  onGenerateAll,
  generating,
  sections,
}) => {
  const has = (sec: 'self' | 'reg' | 'peer' | 'dept' | 'clues') =>
    !sections || sections.includes(sec);
  const [newPeerName, setNewPeerName] = useState('');
  const [newPeerTag, setNewPeerTag] = useState(
    I18N.esg.preResearchDefaultPeerTag,
  );
  const [newPeerRating, setNewPeerRating] = useState('');

  const updateField = <K extends keyof PreResearchProject>(
    key: K,
    value: PreResearchProject[K],
  ) => {
    onChange({
      ...project,
      [key]: value,
    });
  };

  const appendSelfMaterial = (name: string, url?: string, size?: number) => {
    const lower = name.toLowerCase();
    let category: UploadedMaterialItem['category'] = 'esg_report';
    if (lower.includes('annual') || /\b20\d{2}.*report/i.test(name)) {
      category = 'annual_report';
    } else if (lower.includes('org') || lower.includes('.xls')) {
      category = 'org_doc';
    }
    const item: UploadedMaterialItem = {
      id: `mat-${uuid().slice(0, 8)}`,
      name,
      url,
      fileSize: size ? `${(size / 1024).toFixed(1)} KB` : '—',
      category,
      uploadedAt: dayjs().format('YYYY-MM-DD'),
    };
    updateField('selfMaterials', [...project.selfMaterials, item]);
  };

  const handleAddDepartment = () => {
    const nextDept: DepartmentDutyItem = {
      id: `dept-${uuid().slice(0, 6)}`,
      deptCode: `D${project.departments.length + 1}`,
      deptName: I18N.esg.preResearchDefaultDeptName,
      pillars: ['S'],
      topics: [I18N.esg.preResearchDefaultDeptTopic],
      dutySummary: I18N.esg.preResearchDefaultDeptDuty,
    };
    updateField('departments', [...project.departments, nextDept]);
  };

  const handleAddPeer = () => {
    if (!newPeerName.trim()) {
      Toast('warn', I18N.esg.preResearchAddPeer);
      return;
    }
    const peer: PeerCompanyItem = {
      id: `peer-${uuid().slice(0, 6)}`,
      name: newPeerName.trim(),
      tag: newPeerTag.trim() || I18N.esg.preResearchDefaultPeerTagFallback,
      listingMarket: I18N.esg.preResearchDefaultPeerMarket,
      ratingSummary: newPeerRating.trim() || '-',
      selected: true,
    };
    updateField('peers', [...project.peers, peer]);
    setNewPeerName('');
    setNewPeerRating('');
  };

  const deptColumns: ColumnsType<DepartmentDutyItem> = [
    {
      title: I18N.esg.preResearchDeptListTitle,
      dataIndex: 'deptName',
      width: 200,
      render: (_, record) => (
        <Input
          size='small'
          value={record.deptName}
          onChange={e => {
            const next = project.departments.map(d =>
              d.id === record.id ? { ...d, deptName: e.target.value } : d,
            );
            updateField('departments', next);
          }}
        />
      ),
    },
    {
      title: I18N.esg.preResearchFilterPillar,
      dataIndex: 'pillars',
      width: 140,
      render: (_, record) => (
        <Select<EsgPillar[]>
          mode='multiple'
          size='small'
          style={{ width: '100%' }}
          value={record.pillars}
          options={['E', 'S', 'G'].map(p => ({ label: p, value: p }))}
          onChange={pillars => {
            const next = project.departments.map(d =>
              d.id === record.id ? { ...d, pillars } : d,
            );
            updateField('departments', next);
          }}
        />
      ),
    },
    {
      title: I18N.esg.preResearchDeptDutyTable,
      dataIndex: 'dutySummary',
      render: (_, record) => (
        <Input
          size='small'
          value={record.dutySummary}
          onChange={e => {
            const next = project.departments.map(d =>
              d.id === record.id ? { ...d, dutySummary: e.target.value } : d,
            );
            updateField('departments', next);
          }}
        />
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, record) => (
        <Button
          type='text'
          danger
          size='small'
          icon={<DeleteOutlined />}
          onClick={() =>
            updateField(
              'departments',
              project.departments.filter(d => d.id !== record.id),
            )
          }
        />
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      {(has('self') || has('reg')) && (
        <div
          className={
            has('self') && has('reg') ? styles.topGrid : styles.singleCol
          }
        >
          {has('self') && (
            <Card
              size='small'
              title={I18N.esg.preResearchLookSelf}
              extra={
                <Upload
                  name='file'
                  multiple
                  showUploadList={false}
                  accept={ACCEPT_FILES}
                  action={`${
                    process.env.REACT_APP_API_URL || ''
                  }/file/file/uploadImg`}
                  beforeUpload={file => {
                    if (
                      isEsgMockModeEnabled() ||
                      !process.env.REACT_APP_API_URL
                    ) {
                      appendSelfMaterial(file.name, undefined, file.size);
                      return false;
                    }
                    return true;
                  }}
                  onChange={({ file }) => {
                    if (file.status === 'done') {
                      const url = (file.response as { data?: string })?.data;
                      appendSelfMaterial(file.name, url, file.size);
                    } else if (file.status === 'error') {
                      appendSelfMaterial(file.name, undefined, file.size);
                    }
                  }}
                >
                  <Button size='small' icon={<UploadOutlined />}>
                    {I18N.esg.preResearchUploadSelfFile}
                  </Button>
                </Upload>
              }
            >
              <div className={styles.fileTags}>
                {project.selfMaterials.map(mat => (
                  <Tag
                    key={mat.id}
                    closable
                    color='cyan'
                    onClose={() =>
                      updateField(
                        'selfMaterials',
                        project.selfMaterials.filter(m => m.id !== mat.id),
                      )
                    }
                  >
                    {`${mat.name} (${mat.fileSize || '—'})`}
                  </Tag>
                ))}
              </div>
              {has('clues') && (
                <>
                  <div className={styles.fieldGroup}>
                    <div className={styles.fieldLabel}>
                      {I18N.esg.preResearchAnnualClues}
                    </div>
                    <Input.TextArea
                      value={project.annualReportClues}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      onChange={e =>
                        updateField('annualReportClues', e.target.value)
                      }
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <div className={styles.fieldLabel}>
                      {I18N.esg.preResearchWebsiteClues}
                    </div>
                    <Input.TextArea
                      value={project.websiteHighlights}
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      onChange={e =>
                        updateField('websiteHighlights', e.target.value)
                      }
                    />
                  </div>
                </>
              )}
            </Card>
          )}

          {has('reg') && (
            <Card size='small' title={I18N.esg.preResearchLookReg}>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>
                  {I18N.esg.referenceStandards}
                </div>
                <Select
                  mode='multiple'
                  style={{ width: '100%' }}
                  value={project.standards}
                  options={DEFAULT_STANDARD_OPTIONS.map(s => ({
                    label: s,
                    value: s,
                  }))}
                  onChange={vals => updateField('standards', vals)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <div className={styles.fieldLabel}>{I18N.esg.esgRating}</div>
                <Select
                  mode='multiple'
                  style={{ width: '100%' }}
                  value={project.ratings}
                  options={DEFAULT_RATING_OPTIONS.map(r => ({
                    label: r,
                    value: r,
                  }))}
                  onChange={vals => updateField('ratings', vals)}
                />
              </div>
              {onGenerateAll && (
                <div className={styles.generateBanner}>
                  <Button
                    type='primary'
                    loading={generating}
                    onClick={onGenerateAll}
                  >
                    {I18N.esg.preResearchGenerateAll}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {has('clues') && !has('self') && (
        <Card size='small' title={I18N.esg.preResearchCluesSummary}>
          <div className={styles.topGrid}>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                {I18N.esg.preResearchAnnualClues}
              </div>
              <Input.TextArea
                value={project.annualReportClues}
                autoSize={{ minRows: 2, maxRows: 4 }}
                onChange={e => updateField('annualReportClues', e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>
                {I18N.esg.preResearchWebsiteClues}
              </div>
              <Input.TextArea
                value={project.websiteHighlights}
                autoSize={{ minRows: 2, maxRows: 4 }}
                onChange={e => updateField('websiteHighlights', e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {has('peer') && (
        <Card size='small' title={I18N.esg.preResearchLookPeer}>
          <div className={styles.peerAddBar}>
            <Input
              value={newPeerName}
              onChange={e => setNewPeerName(e.target.value)}
              placeholder={I18N.esg.preResearchCompanyName}
              style={{ width: 220 }}
            />
            <Input
              value={newPeerTag}
              onChange={e => setNewPeerTag(e.target.value)}
              style={{ width: 160 }}
            />
            <Input
              value={newPeerRating}
              onChange={e => setNewPeerRating(e.target.value)}
              placeholder={I18N.esg.esgRating}
              style={{ width: 180 }}
            />
            <Button icon={<PlusOutlined />} onClick={handleAddPeer}>
              {I18N.esg.preResearchAddPeer}
            </Button>
          </div>
          <div className={styles.peerCards}>
            {project.peers.map(peer => (
              <div key={peer.id} className={styles.peerCard}>
                <div className={styles.peerCardHead}>
                  <span className={styles.peerName}>{peer.name}</span>
                  <Button
                    type='text'
                    danger
                    size='small'
                    icon={<DeleteOutlined />}
                    onClick={() =>
                      updateField(
                        'peers',
                        project.peers.filter(p => p.id !== peer.id),
                      )
                    }
                  />
                </div>
                <div className={styles.peerMeta}>
                  <Tag color='geekblue'>{peer.tag}</Tag>
                  <span>{peer.ratingSummary}</span>
                </div>
                <div className={styles.peerUpload}>
                  <Upload
                    name='file'
                    showUploadList={false}
                    accept={ACCEPT_FILES}
                    beforeUpload={file => {
                      const next = project.peers.map(p =>
                        p.id === peer.id
                          ? { ...p, reportFileName: file.name }
                          : p,
                      );
                      updateField('peers', next);
                      return false;
                    }}
                  >
                    <Button size='small' icon={<UploadOutlined />}>
                      {peer.reportFileName ||
                        I18N.esg.preResearchUploadPeerFile}
                    </Button>
                  </Upload>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {has('dept') && (
        <Card
          size='small'
          title={I18N.esg.preResearchDeptDutyTable}
          extra={
            <Button
              size='small'
              icon={<PlusOutlined />}
              onClick={handleAddDepartment}
            >
              {I18N.esg.preResearchAddDept}
            </Button>
          }
        >
          <Table
            rowKey='id'
            size='small'
            pagination={false}
            columns={deptColumns}
            dataSource={project.departments}
          />
        </Card>
      )}
    </div>
  );
};
