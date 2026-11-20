import { DownOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { useAllEnumsBatch } from '@src/views/dashborad/Dicts/hooks';
import {
  Button,
  Checkbox,
  Empty,
  Input,
  message,
  Modal,
  Pagination,
  Progress,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd';
import moment from 'moment';
import { saveAs } from 'file-saver';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import addFactoryIcon from './assets/add-factory.svg';
import archivedIcon from './assets/archived.svg';
import editingIcon from './assets/editing.svg';
import effectiveIcon from './assets/effective.svg';
import emptySearchIcon from './assets/empty-search.svg';
import monitorPlanIcon from './assets/monitor-plan.svg';
import planTotalIcon from './assets/plan-total.svg';
import { FactoryDrawer } from './components/FactoryDrawer';
import { showMonitorDeleteConfirm } from './deleteConfirm';
import styles from './index.module.less';
import {
  copyMonitorPlan,
  deleteMonitorFactory,
  deleteMonitorPlan,
  generateMonitorPlanReport,
  getMonitorFactoryPage,
  getMonitorOverview,
  getMonitorOrgTree,
  getMonitorYears,
  MonitorOrgOption,
  MonitorPlanReportLanguage,
} from './service';
import {
  MonitorFactoryGroup,
  MonitorOverview,
  MonitorPlanListItem,
  MonitorPlanQuery,
  MonitorPlanStatus,
} from './types';

const statusOptions = () => [
  { label: I18N.cbamMonitor.editing, value: 0 },
  { label: I18N.cbamMonitor.effective, value: 1 },
  { label: I18N.cbamMonitor.archived, value: 2 },
];

const statusName = (status: MonitorPlanStatus) =>
  ({
    0: I18N.cbamMonitor.editing,
    1: I18N.cbamMonitor.effective,
    2: I18N.cbamMonitor.archived,
  }[status]);

const STATUS_CLASS: Record<MonitorPlanStatus, string> = {
  0: styles.statusEditing,
  1: styles.statusEffective,
  2: styles.statusArchived,
};

const EMPTY_OVERVIEW: MonitorOverview = {
  totalCount: 0,
  editingCount: 0,
  effectiveCount: 0,
  archivedCount: 0,
};

const collectOrgNames = (items: MonitorOrgOption[]) =>
  items.reduce<Record<number, string>>(
    (result, item) => ({
      ...result,
      [item.id]: item.name,
      ...collectOrgNames(item.children || []),
    }),
    {},
  );

const openPlanPath = (
  pageType: 'add' | 'edit',
  id?: number,
  factoryId?: number,
) =>
  `/cbam/monitor/${pageType}${id ? `/${id}` : ''}${
    factoryId ? `?factoryId=${factoryId}` : ''
  }`;

const reportFileName = (contentDisposition?: string, fallback?: string) => {
  const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) return decodeURIComponent(encoded);
  const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  const mimeWord = plain?.match(/^=\?UTF-8\?Q\?(.+)\?=$/i)?.[1];
  if (mimeWord) {
    return decodeURIComponent(
      mimeWord.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, '%$1'),
    );
  }
  return plain ? decodeURIComponent(plain) : fallback;
};

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>
      <img src={icon} alt='' />
    </div>
    <div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  </div>
);

const MonitorList = () => {
  const history = useHistory();
  const [query, setQuery] = useState<MonitorPlanQuery>({
    pageNum: 1,
    pageSize: 20,
  });
  const [overview, setOverview] = useState<MonitorOverview>(EMPTY_OVERVIEW);
  const [groups, setGroups] = useState<MonitorFactoryGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [years, setYears] = useState<number[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [factoryOpen, setFactoryOpen] = useState(false);
  const [editingFactoryId, setEditingFactoryId] = useState<number>();
  const [copyingPlanId, setCopyingPlanId] = useState<number>();
  const [reportPlan, setReportPlan] = useState<MonitorPlanListItem>();
  const [reportLanguages, setReportLanguages] = useState<
    MonitorPlanReportLanguage[]
  >(['EN']);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [orgNames, setOrgNames] = useState<Record<number, string>>({});
  const countryEnums = useAllEnumsBatch('CBAMcountryinfo')?.CBAMcountryinfo;
  const countryOptions = useMemo(
    () =>
      (countryEnums || []).map(item => ({
        label: item.dictLabel,
        value: item.dictValue,
        relatedValue: item.relatedValue,
      })),
    [countryEnums],
  );
  const countryNames = useMemo(
    () => new Map(countryOptions.map(item => [item.value, item.label])),
    [countryOptions],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filter = {
        name: query.name,
        status: query.status,
        year: query.year,
      };
      const [overviewResp, pageResp, yearsResp, orgResp] = await Promise.all([
        getMonitorOverview(filter),
        getMonitorFactoryPage(query),
        getMonitorYears(),
        getMonitorOrgTree(),
      ]);
      setOverview(overviewResp.data?.data || EMPTY_OVERVIEW);
      const page = pageResp.data?.data;
      setGroups(page?.records || []);
      setTotal(page?.total || 0);
      setYears(yearsResp.data?.data || []);
      setOrgNames(collectOrgNames(orgResp.data?.data || []));
      setExpanded((page?.records || []).map(item => item.factoryId));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const cards = useMemo(
    () => [
      {
        icon: planTotalIcon,
        label: I18N.cbamMonitor.planTotal,
        value: overview.totalCount,
      },
      {
        icon: editingIcon,
        label: I18N.cbamMonitor.editing,
        value: overview.editingCount,
      },
      {
        icon: effectiveIcon,
        label: I18N.cbamMonitor.effective,
        value: overview.effectiveCount,
      },
      {
        icon: archivedIcon,
        label: I18N.cbamMonitor.archived,
        value: overview.archivedCount,
      },
    ],
    [overview],
  );

  const allFactoriesExpanded =
    groups.length > 0 &&
    groups.every(group => expanded.includes(group.factoryId));

  const toggleAllFactories = () => {
    setExpanded(
      allFactoriesExpanded ? [] : groups.map(group => group.factoryId),
    );
  };

  const confirmDelete = (plan: MonitorPlanListItem) => {
    showMonitorDeleteConfirm({
      title: I18N.cbamMonitor.confirmDeletePlan,
      content: I18N.template(I18N.cbamMonitor.deletePlanTip, {
        name: plan.planName || I18N.cbamMonitor.monitoringPlan,
      }),
      onOk: async () => {
        await deleteMonitorPlan(plan.id);
        await load();
      },
    });
  };

  const confirmDeleteFactory = (factory: MonitorFactoryGroup) => {
    showMonitorDeleteConfirm({
      title: I18N.cbamMonitor.confirmDeleteFactory,
      content: I18N.template(I18N.cbamMonitor.deleteFactoryTip, {
        name: factory.factoryName || I18N.cbamMonitor.factory,
      }),
      onOk: async () => {
        await deleteMonitorFactory(factory.factoryId);
        await load();
      },
    });
  };

  const copyPlan = async (planId: number) => {
    setCopyingPlanId(planId);
    try {
      const { data } = await copyMonitorPlan(planId);
      const copiedPlanId = data?.data;
      if (!copiedPlanId) {
        message.error(I18N.cbamMonitor.copyPlanFailed);
        return;
      }
      history.push(openPlanPath('edit', copiedPlanId));
    } catch (error) {
      const requestError = error as {
        data?: { msg?: string };
        response?: { data?: { msg?: string } };
      };
      message.error(
        requestError.data?.msg ||
          requestError.response?.data?.msg ||
          I18N.cbamMonitor.copyPlanFailed,
      );
    } finally {
      setCopyingPlanId(undefined);
    }
  };

  const confirmCopyPlan = (plan: MonitorPlanListItem) => {
    showMonitorDeleteConfirm({
      title: I18N.cbamMonitor.confirmCopyPlan,
      content: I18N.template(I18N.cbamMonitor.copyPlanTip, {
        name: plan.planName || I18N.cbamMonitor.monitoringPlan,
      }),
      onOk: () => copyPlan(plan.id),
    });
  };

  const openGenerateReport = (plan: MonitorPlanListItem) => {
    setReportPlan(plan);
    setReportLanguages(['EN']);
  };

  const generateReports = async () => {
    if (!reportPlan || reportLanguages.length === 0) return;
    setGeneratingReport(true);
    const results = await Promise.allSettled(
      reportLanguages.map(async language => {
        const response = await generateMonitorPlanReport(
          reportPlan.id,
          language,
        );
        const fallback = `${
          reportPlan.planName || 'CBAM_Monitoring_Plan'
        }_${language.toLowerCase()}.docx`;
        saveAs(
          response.data,
          reportFileName(response.headers['content-disposition'], fallback),
        );
      }),
    );
    setGeneratingReport(false);
    const successCount = results.filter(
      result => result.status === 'fulfilled',
    ).length;
    if (successCount === results.length) {
      message.success(I18N.cbamMonitor.reportGenerated);
      setReportPlan(undefined);
      return;
    }
    if (successCount > 0) {
      message.warning(I18N.cbamMonitor.reportPartiallyGenerated);
      setReportPlan(undefined);
      return;
    }
    message.error(I18N.cbamMonitor.reportGenerateFailed);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.pageHeader}>
        {I18N.cbamMonitor.monitorManagement}
      </h1>
      <div className={styles.content}>
        <div className={styles.statGrid}>
          {cards.map(card => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
        <div className={styles.toolbar}>
          <Space size={16}>
            <Input.Search
              allowClear
              placeholder={I18N.cbamMonitor.planOrFactory}
              className={styles.search}
              onSearch={name =>
                setQuery(current => ({ ...current, name, pageNum: 1 }))
              }
            />
            <Select
              allowClear
              placeholder={I18N.cbamMonitor.planStatus}
              options={statusOptions()}
              className={styles.filterSelect}
              onChange={status =>
                setQuery(current => ({ ...current, status, pageNum: 1 }))
              }
            />
            <Select
              allowClear
              placeholder={I18N.cbamMonitor.year}
              options={years.map(year => ({ label: year, value: year }))}
              className={styles.filterSelect}
              onChange={year =>
                setQuery(current => ({ ...current, year, pageNum: 1 }))
              }
            />
          </Space>
          <Space size={16}>
            <Button
              className={styles.addFactoryButton}
              icon={
                <img
                  className={styles.addFactoryIcon}
                  src={addFactoryIcon}
                  alt=''
                />
              }
              onClick={() => {
                setEditingFactoryId(undefined);
                setFactoryOpen(true);
              }}
            >
              {I18N.cbamMonitor.addFactory}
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => history.push(openPlanPath('add'))}
            >
              {I18N.cbamMonitor.addPlan}
            </Button>
          </Space>
        </div>
        <Spin spinning={loading}>
          <div className={styles.factoryTable}>
            <div className={`${styles.factoryRow} ${styles.tableHeader}`}>
              <button
                type='button'
                className={styles.factoryHeaderToggle}
                aria-label={
                  allFactoriesExpanded
                    ? I18N.cbamMonitor.collapseAllFactories
                    : I18N.cbamMonitor.expandAllFactories
                }
                onClick={toggleAllFactories}
              >
                {allFactoriesExpanded ? <DownOutlined /> : <RightOutlined />}
                <span>{I18N.cbamMonitor.factoryName}</span>
              </button>
              <span>{I18N.cbamMonitor.relatedEntity}</span>
              <span>{I18N.cbamMonitor.uniqueIdentifier}</span>
              <span>{I18N.cbamMonitor.region}</span>
              <span>{I18N.cbamMonitor.operation}</span>
            </div>
            {groups.map(group => {
              const isOpen = expanded.includes(group.factoryId);
              const countryName = countryNames.get(group.country || '');
              return (
                <div key={group.factoryId} className={styles.factoryGroup}>
                  <div className={styles.factoryRow}>
                    <button
                      type='button'
                      className={styles.factoryName}
                      onClick={() =>
                        setExpanded(current =>
                          isOpen
                            ? current.filter(id => id !== group.factoryId)
                            : [...current, group.factoryId],
                        )
                      }
                    >
                      {isOpen ? <DownOutlined /> : <RightOutlined />}
                      <span
                        className={styles.factoryNameText}
                        title={group.factoryName}
                      >
                        {group.factoryName}
                      </span>
                    </button>
                    <span
                      title={group.orgId ? orgNames[group.orgId] || '--' : '--'}
                    >
                      {group.orgId ? orgNames[group.orgId] || '--' : '--'}
                    </span>
                    <span title={group.factoryCode || '--'}>
                      {group.factoryCode || '--'}
                    </span>
                    <span
                      title={
                        [countryName, group.city].filter(Boolean).join(' / ') ||
                        '--'
                      }
                    >
                      {[countryName, group.city].filter(Boolean).join(' / ') ||
                        '--'}
                    </span>
                    <Space size={16}>
                      <button
                        type='button'
                        className={styles.linkAction}
                        onClick={() => {
                          setEditingFactoryId(group.factoryId);
                          setFactoryOpen(true);
                        }}
                      >
                        {I18N.cbamMonitor.edit}
                      </button>
                      <button
                        type='button'
                        className={styles.linkAction}
                        onClick={() =>
                          history.push(
                            openPlanPath('add', undefined, group.factoryId),
                          )
                        }
                      >
                        {I18N.cbamMonitor.addPlan}
                      </button>
                      <button
                        type='button'
                        className={`${styles.linkAction} ${styles.deleteAction}`}
                        onClick={() => confirmDeleteFactory(group)}
                      >
                        {I18N.cbamMonitor.delete}
                      </button>
                    </Space>
                  </div>
                  {isOpen && (
                    <div className={styles.planPanel}>
                      <div className={styles.planPanelInner}>
                        <div className={styles.planPanelTitle}>
                          <div className={styles.planPanelHeading}>
                            <img src={monitorPlanIcon} alt='' />
                            <div className={styles.planPanelText}>
                              <span className={styles.planPanelName}>
                                {I18N.cbamMonitor.planInformation}
                              </span>
                              <span className={styles.planPanelHint}>
                                {I18N.cbamMonitor.planInformationHint}
                              </span>
                            </div>
                          </div>
                          <Tag className={styles.planVersionTag}>
                            {I18N.template(I18N.cbamMonitor.versionCount, {
                              count: group.plans.length,
                            })}
                          </Tag>
                        </div>
                        <div
                          className={`${styles.planRow} ${styles.planHeader}`}
                        >
                          <span>{I18N.cbamMonitor.planName}</span>
                          <span>{I18N.cbamMonitor.year}</span>
                          <span>{I18N.cbamMonitor.cbamProduct}</span>
                          <span>{I18N.cbamMonitor.status}</span>
                          <span>{I18N.cbamMonitor.completion}</span>
                          <span>{I18N.cbamMonitor.latestUpdate}</span>
                          <span>{I18N.cbamMonitor.operation}</span>
                        </div>
                        {group.plans.map(plan => (
                          <div className={styles.planRow} key={plan.id}>
                            <span>
                              {plan.planName || '--'}{' '}
                              <Tag>{plan.versionNo || '--'}</Tag>
                            </span>
                            <span>{plan.year}</span>
                            <span>{plan.products?.join('、') || '--'}</span>
                            <span>
                              <Tag className={STATUS_CLASS[plan.status]}>
                                {statusName(plan.status)}
                              </Tag>
                            </span>
                            <span className={styles.completionCell}>
                              <Progress
                                percent={Number(plan.completionRate || 0)}
                                showInfo={false}
                                strokeColor='#026961'
                                trailColor='#e5e7eb'
                                size='small'
                              />
                              {Number(plan.completionRate || 0).toFixed(0)}%
                            </span>
                            <span>
                              {plan.updateTime
                                ? moment(plan.updateTime).format(
                                    'YYYY/M/D HH:mm:ss',
                                  )
                                : '--'}
                            </span>
                            <Space size={16}>
                              <button
                                type='button'
                                className={styles.linkAction}
                                onClick={() => openGenerateReport(plan)}
                              >
                                {I18N.cbamMonitor.generateFile}
                              </button>
                              <button
                                type='button'
                                className={styles.linkAction}
                                onClick={() =>
                                  history.push(openPlanPath('edit', plan.id))
                                }
                              >
                                {I18N.cbamMonitor.view}
                              </button>
                              <button
                                type='button'
                                className={styles.linkAction}
                                disabled={copyingPlanId === plan.id}
                                onClick={() => confirmCopyPlan(plan)}
                              >
                                {I18N.cbamMonitor.copy}
                              </button>
                              <button
                                type='button'
                                className={`${styles.linkAction} ${styles.deleteAction}`}
                                onClick={() => confirmDelete(plan)}
                              >
                                {I18N.cbamMonitor.delete}
                              </button>
                            </Space>
                          </div>
                        ))}
                        {group.plans.length === 0 && (
                          <div className={styles.planEmpty}>
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={I18N.cbamMonitor.noData}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && groups.length === 0 && (
              <div className={styles.factoryEmpty}>
                <div className={styles.factoryEmptyIcon}>
                  <img src={emptySearchIcon} alt='' />
                </div>
                <span>{I18N.cbamMonitor.noSearchContent}</span>
              </div>
            )}
          </div>
        </Spin>
        <div className={styles.pagination}>
          <Pagination
            current={query.pageNum}
            pageSize={query.pageSize}
            total={total}
            showSizeChanger={false}
            onChange={pageNum => setQuery(current => ({ ...current, pageNum }))}
          />
        </div>
      </div>
      <FactoryDrawer
        open={factoryOpen}
        factoryId={editingFactoryId}
        countryOptions={countryOptions}
        onClose={() => setFactoryOpen(false)}
        onSaved={() => {
          setFactoryOpen(false);
          load();
        }}
      />
      <Modal
        open={Boolean(reportPlan)}
        centered
        width={444}
        title={I18N.cbamMonitor.generateFile}
        className={styles.reportModal}
        okText={I18N.cbamMonitor.confirm}
        cancelText={I18N.cbamMonitor.cancel}
        confirmLoading={generatingReport}
        okButtonProps={{ disabled: reportLanguages.length === 0 }}
        maskClosable={!generatingReport}
        closable={!generatingReport}
        onCancel={() => setReportPlan(undefined)}
        onOk={generateReports}
      >
        <div className={styles.reportModalHint}>
          {I18N.cbamMonitor.selectReportLanguage}
        </div>
        <Checkbox.Group
          className={styles.reportLanguageGroup}
          value={reportLanguages}
          onChange={values =>
            setReportLanguages(values as MonitorPlanReportLanguage[])
          }
        >
          <Checkbox value='EN'>{I18N.cbamMonitor.englishReport}</Checkbox>
          <Checkbox value='ZH'>{I18N.cbamMonitor.chineseReport}</Checkbox>
        </Checkbox.Group>
      </Modal>
    </div>
  );
};

export default MonitorList;
