import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { App, Button, Empty, Input, Select, Spin, Tag } from 'antd';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { RouteMaps } from '@/router/route-paths';
import { Toast } from '@/utils';

import { CreateProjectModal } from './components/CreateProjectModal';
import styles from './index.module.less';
import {
  deleteLocalPreResearchProject,
  getLocalPreResearchList,
  saveLocalPreResearchProject,
} from './mockService';
import {
  deletePreResearchProjectApi,
  getPreResearchList,
  savePreResearchProject,
} from './service';
import { PreResearchProject, PreResearchProjectStatus } from './types';
import { isEsgMockModeEnabled } from '../mockReportService';
import { resolveEsgRoute } from '../routeUtils';

const STATUS_COLOR: Record<PreResearchProjectStatus, string> = {
  draft: 'default',
  in_progress: 'processing',
  completed: 'success',
};

const getStatusLabel = (status: PreResearchProjectStatus) => {
  if (status === 'draft') return I18N.esg.preResearchStatusDraft;
  if (status === 'completed') return I18N.esg.preResearchStatusCompleted;
  return I18N.esg.preResearchStatusInProgress;
};

export const PreResearchList: FC = () => {
  const { modal } = App.useApp();
  const history = useHistory();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<PreResearchProject[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    const localRows = getLocalPreResearchList();
    if (isEsgMockModeEnabled()) {
      setProjects(localRows);
      setLoading(false);
      return;
    }
    try {
      const res = await getPreResearchList(undefined, {
        silentResponseError: true,
      });
      const remoteRows = res?.data?.rows || [];
      const merged = [...localRows];
      remoteRows.forEach(r => {
        if (!merged.some(l => l.id === r.id)) {
          merged.push(r);
        }
      });
      setProjects(merged);
    } catch {
      setProjects(localRows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return projects.filter(p => {
      const matchKw =
        !kw ||
        p.projectName.toLowerCase().includes(kw) ||
        p.companyName.toLowerCase().includes(kw);
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchKw && matchStatus;
    });
  }, [projects, keyword, statusFilter]);

  const goToDetail = (projectId: string) => {
    const path = resolveEsgRoute(
      RouteMaps.ESGPreResearchDetail.replace(':id', projectId),
      location.pathname,
    );
    history.push(path);
  };

  const handleCreate = async (project: PreResearchProject) => {
    saveLocalPreResearchProject(project);
    if (!isEsgMockModeEnabled()) {
      await savePreResearchProject(project, {
        silentResponseError: true,
      }).catch(() => {});
    }
    setCreateOpen(false);
    goToDetail(project.id);
  };

  const handleDelete = (projectId: string) => {
    modal.confirm({
      title: I18N.esg.preResearchDeleteConfirm,
      onOk: async () => {
        deleteLocalPreResearchProject(projectId);
        if (!isEsgMockModeEnabled()) {
          await deletePreResearchProjectApi(projectId, {
            silentResponseError: true,
          }).catch(() => {});
        }
        Toast('success', I18N.esg.preResearchDeleteSuccess);
        loadList();
      },
    });
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{I18N.esg.preResearchTitle}</div>
          <div className={styles.subtitle}>{I18N.esg.preResearchSubtitle}</div>
        </div>
        <Button
          type='primary'
          icon={<PlusOutlined />}
          onClick={() => setCreateOpen(true)}
        >
          {I18N.esg.preResearchCreateBtn}
        </Button>
      </div>

      <div className={styles.filterBar}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={I18N.esg.preResearchSearchPlaceholder}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: 260 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { label: I18N.esg.preResearchAllStatus, value: 'ALL' },
            { label: I18N.esg.preResearchStatusDraft, value: 'draft' },
            {
              label: I18N.esg.preResearchStatusInProgress,
              value: 'in_progress',
            },
            { label: I18N.esg.preResearchStatusCompleted, value: 'completed' },
          ]}
        />
      </div>

      <Spin spinning={loading}>
        {filtered.length === 0 ? (
          <div className={styles.emptyBox}>
            <Empty description={I18N.esg.preResearchEmptyTip} />
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {filtered.map(item => {
              const p0Count = item.gapItems.filter(
                g => g.priority === 'P0',
              ).length;
              return (
                <div
                  key={item.id}
                  className={styles.card}
                  onClick={() => goToDetail(item.id)}
                >
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>{item.projectName}</div>
                    <Tag color={STATUS_COLOR[item.status]}>
                      {getStatusLabel(item.status)}
                    </Tag>
                  </div>
                  <div className={styles.cardMeta}>
                    <span>{item.companyName}</span>
                    <span>{item.period}</span>
                    <span>{item.industry}</span>
                  </div>
                  <div className={styles.cardStandards}>
                    {item.standards.slice(0, 3).map(std => (
                      <Tag key={std} color='cyan'>
                        {std}
                      </Tag>
                    ))}
                  </div>
                  <div className={styles.cardStats}>
                    <span>{`${I18N.esg.preResearchGapTotal}: ${item.gapItems.length}`}</span>
                    <span>{`${I18N.esg.preResearchGapP0}: ${p0Count}`}</span>
                    <span>{`${I18N.esg.preResearchDeptListTitle}: ${item.departments.length}`}</span>
                  </div>
                  <div className={styles.cardFoot}>
                    <span className={styles.updatedText}>{item.updatedAt}</span>
                    <div
                      className={styles.cardActions}
                      onClick={e => e.stopPropagation()}
                    >
                      <Button
                        type='text'
                        danger
                        size='small'
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(item.id)}
                      />
                      <Button
                        type='primary'
                        size='small'
                        onClick={() => goToDetail(item.id)}
                      >
                        {I18N.esg.preResearchEnterDetail}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Spin>

      <CreateProjectModal
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
};

export default PreResearchList;
