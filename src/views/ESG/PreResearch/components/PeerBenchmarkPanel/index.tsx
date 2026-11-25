import {
  CheckOutlined,
  DownloadOutlined,
  FileWordOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Card, Checkbox, Empty, Input, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FC, useMemo, useState } from 'react';

import { Toast } from '@/utils';

import styles from './index.module.less';
import {
  exportPeerBenchmarkExcel,
  exportPeerBenchmarkWord,
} from '../../exportUtils';
import {
  HighlightCaseItem,
  PeerBenchmarkRow,
  PreResearchProject,
} from '../../types';

export interface IPeerBenchmarkPanelProps {
  project: PreResearchProject;
  onChangeRows: (rows: PeerBenchmarkRow[]) => void;
  onChangeCases: (cases: HighlightCaseItem[]) => void;
  onChangePeers: (peers: PreResearchProject['peers']) => void;
  onRegenerate: () => void;
  generating: boolean;
}

export const PeerBenchmarkPanel: FC<IPeerBenchmarkPanelProps> = ({
  project,
  onChangeRows,
  onChangeCases,
  onChangePeers,
  onRegenerate,
  generating,
}) => {
  const [blindOnly, setBlindOnly] = useState(false);

  const selectedPeers = useMemo(
    () => project.peers.filter(p => p.selected !== false),
    [project.peers],
  );

  const togglePeerSelected = (peerId: string) => {
    onChangePeers(
      project.peers.map(p =>
        p.id === peerId ? { ...p, selected: p.selected === false } : p,
      ),
    );
  };

  const handleConfirmGenerate = () => {
    if (selectedPeers.length === 0) {
      Toast('warn', I18N.esg.preResearchSelectAtLeastOnePeer);
      return;
    }
    onRegenerate();
  };

  const visibleRows = useMemo(
    () =>
      blindOnly
        ? project.benchmarkRows.filter(r => r.isPeerBlindSpot)
        : project.benchmarkRows,
    [project.benchmarkRows, blindOnly],
  );

  const updateRowDiagnosis = (rowId: string, aiDiagnosis: string) => {
    onChangeRows(
      project.benchmarkRows.map(r =>
        r.id === rowId ? { ...r, aiDiagnosis } : r,
      ),
    );
  };

  const updateSelfValue = (rowId: string, selfValue: string) => {
    onChangeRows(
      project.benchmarkRows.map(r =>
        r.id === rowId ? { ...r, selfValue } : r,
      ),
    );
  };

  const toggleCaseAdopted = (caseId: string) => {
    onChangeCases(
      project.highlightCases.map(c =>
        c.id === caseId ? { ...c, adoptedForReport: !c.adoptedForReport } : c,
      ),
    );
  };

  const columns: ColumnsType<PeerBenchmarkRow> = [
    {
      title: I18N.esg.preResearchModuleBenchmarkShort,
      dataIndex: 'metricName',
      width: 210,
      fixed: 'left',
      render: (_, record) => (
        <div>
          <div className={styles.dimGroup}>{record.dimensionGroup}</div>
          <div className={styles.metricName}>{record.metricName}</div>
          {record.isPeerBlindSpot && (
            <Tag color='error' style={{ marginTop: 6 }}>
              {I18N.esg.preResearchBlindSpotTag}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: project.companyName,
      dataIndex: 'selfValue',
      width: 190,
      render: (_, record) => (
        <Input.TextArea
          size='small'
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={record.selfValue}
          onChange={e => updateSelfValue(record.id, e.target.value)}
        />
      ),
    },
    ...selectedPeers.map(peer => ({
      title: (
        <div>
          <div>{peer.name}</div>
          <div className={styles.peerTag}>{peer.ratingSummary}</div>
        </div>
      ),
      dataIndex: peer.id,
      width: 190,
      render: (_: unknown, record: PeerBenchmarkRow) => (
        <div className={styles.peerVal}>
          {record.peerValues[peer.id] || '-'}
        </div>
      ),
    })),
    {
      title: I18N.esg.analysisResults,
      dataIndex: 'aiDiagnosis',
      width: 260,
      render: (_, record) => (
        <Input.TextArea
          size='small'
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={record.aiDiagnosis}
          onChange={e => updateRowDiagnosis(record.id, e.target.value)}
        />
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.peerSelectCard}>
        <div className={styles.peerSelectHeader}>
          <span className={styles.peerSelectTitle}>
            {I18N.template(I18N.esg.preResearchSelectPeersStep, {
              val1: selectedPeers.length,
            })}
          </span>
          <Button
            type='primary'
            icon={<SyncOutlined />}
            loading={generating}
            onClick={handleConfirmGenerate}
          >
            {I18N.esg.preResearchConfirmBenchmarkBtn}
          </Button>
        </div>
        <div className={styles.peerSelectList}>
          {project.peers.map(peer => {
            const checked = peer.selected !== false;
            return (
              <div
                key={peer.id}
                className={checked ? styles.peerChipSelected : styles.peerChip}
                onClick={() => togglePeerSelected(peer.id)}
              >
                <Checkbox checked={checked} />
                <span className={styles.peerChipName}>{peer.name}</span>
                <Tag color='geekblue'>{peer.tag}</Tag>
                <span className={styles.peerChipRating}>
                  {peer.ratingSummary}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.switchWrap}>
          <Switch checked={blindOnly} onChange={setBlindOnly} />
          <span>{I18N.esg.preResearchBlindSpotOnly}</span>
        </div>
        <div className={styles.actions}>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => exportPeerBenchmarkExcel(project)}
          >
            {I18N.esg.preResearchExportExcel}
          </Button>
          <Button
            type='primary'
            icon={<FileWordOutlined />}
            onClick={() => exportPeerBenchmarkWord(project)}
          >
            {I18N.esg.preResearchExportWord}
          </Button>
        </div>
      </div>

      {visibleRows.length === 0 ? (
        <Empty description={I18N.esg.preResearchConfirmPeersTip} />
      ) : (
        <Table
          rowKey='id'
          columns={columns}
          dataSource={visibleRows}
          pagination={false}
          scroll={{ x: 1150 }}
        />
      )}

      <Card size='small' title={I18N.esg.preResearchHighlightPool}>
        <div className={styles.caseGrid}>
          {project.highlightCases.map(item => (
            <div
              key={item.id}
              className={
                item.adoptedForReport ? styles.caseCardAdopted : styles.caseCard
              }
            >
              <div className={styles.caseHead}>
                <Tag color='cyan'>{item.esgPillar}</Tag>
                <span className={styles.casePeer}>{item.peerName}</span>
              </div>
              <div className={styles.caseTitle}>{item.title}</div>
              <div className={styles.caseSummary}>{item.summary}</div>
              <div className={styles.caseFooter}>
                <Button
                  size='small'
                  type={item.adoptedForReport ? 'primary' : 'default'}
                  icon={item.adoptedForReport ? <CheckOutlined /> : undefined}
                  onClick={() => toggleCaseAdopted(item.id)}
                >
                  {item.adoptedForReport
                    ? I18N.esg.preResearchAdoptedTag
                    : I18N.esg.preResearchAdoptBtn}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
