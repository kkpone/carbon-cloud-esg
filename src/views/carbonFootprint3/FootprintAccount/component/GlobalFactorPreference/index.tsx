import { PlusOutlined, ProfileOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import {
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Radio,
  Switch,
  Table,
  Tooltip,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { FC, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { CustomDrawer } from '@/components/CustomDrawer';
import { savedFactorService } from '@/components/FormilyUtil/FormilyFactor/customFactorReuse/service';
import { selectSavedFactorScope } from '@/components/FormilyUtil/FormilyFactor/customFactorReuse/scope';
import SavedFactorManager from '@/components/SavedFactorManager';

import { SourceConfigurationField } from './components/SourceConfigurationField';
import {
  getPreferenceSaveValues,
  resolveSourceIdsByOptions,
} from './configuration';
import type { SourceConfiguration } from './type';
import styles from './index.module.less';
import {
  addGlobalFactorPreferencePlan,
  editGlobalFactorPreferencePlan,
  getGlobalFactorPreferencePlanInfo,
  deleteGlobalFactorPreferencePlan,
  getFactorDatabaseSourceOptions,
  getGlobalFactorPreferencePlanPage,
  setDefaultGlobalFactorPreferencePlan,
  setGlobalFactorPreferencePublished,
} from './service';
import { FactorDatabaseSourceOption, GlobalFactorPreferencePlan } from './type';

type GlobalFactorPreferenceProps = {
  open: boolean;
  onClose: () => void;
};

const getSourceNamesText = (sourceNames?: string) => sourceNames || '-';

const GlobalFactorPreference: FC<GlobalFactorPreferenceProps> = ({
  open,
  onClose,
}) => {
  const [plans, setPlans] = useState<GlobalFactorPreferencePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planPagination, setPlanPagination] = useState({
    pageNum: 1,
    pageSize: 10,
    total: 0,
  });
  const [sourceOptions, setSourceOptions] = useState<
    FactorDatabaseSourceOption[]
  >([]);
  const [sourceOptionsLoading, setSourceOptionsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSubmitting, setDrawerSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GlobalFactorPreferencePlan>();
  const [detailPlan, setDetailPlan] = useState<GlobalFactorPreferencePlan>();
  const [drawerForm] = Form.useForm<
    SourceConfiguration & { name: string; remark?: string }
  >();
  const [editorSession, setEditorSession] = useState(0);
  const scope = useSelector(selectSavedFactorScope);
  const [managerScope, setManagerScope] = useState<string>();
  const editRequest = useRef(0);
  const detailRequest = useRef(0);
  const submitPending = useRef(false);
  const stageEnabled = Form.useWatch('stageEnabled', drawerForm) ?? 0;
  const stageSourceIds = Form.useWatch('stageSourceIds', drawerForm) ?? {};

  useEffect(
    () => () => {
      editRequest.current += 1;
      detailRequest.current += 1;
    },
    [open],
  );

  useEffect(() => {
    setManagerScope(undefined);
  }, [scope, open]);

  const loadPlans = async (pageNum = 1, pageSize = 10) => {
    setPlansLoading(true);
    try {
      const { rows, total } = await getGlobalFactorPreferencePlanPage({
        pageNum,
        pageSize,
      });
      setPlans(rows);
      setPlanPagination({
        pageNum,
        pageSize,
        total,
      });
    } catch {
      setPlans([]);
      setPlanPagination({
        pageNum,
        pageSize,
        total: 0,
      });
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    let cancelled = false;
    const initPlans = async () => {
      try {
        const { rows, total } = await getGlobalFactorPreferencePlanPage({
          pageNum: 1,
          pageSize: planPagination.pageSize,
        });
        if (!cancelled) {
          setPlans(rows);
          setPlanPagination({
            pageNum: 1,
            pageSize: planPagination.pageSize,
            total,
          });
        }
      } catch {
        if (!cancelled) {
          setPlans([]);
          setPlanPagination(prev => ({
            ...prev,
            pageNum: 1,
            total: 0,
          }));
        }
      } finally {
        if (!cancelled) {
          setPlansLoading(false);
        }
      }
    };

    setPlansLoading(true);
    initPlans();

    return () => {
      cancelled = true;
    };
    // 打开弹窗时重置到第一页；pageSize 保留用户上一次选择。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || sourceOptions.length > 0) {
      return undefined;
    }

    let cancelled = false;
    setSourceOptionsLoading(true);
    getFactorDatabaseSourceOptions()
      .then(options => {
        if (!cancelled) {
          setSourceOptions(options);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSourceOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSourceOptionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, sourceOptions.length]);

  const refreshPlans = async () => {
    await loadPlans(planPagination.pageNum, planPagination.pageSize);
  };

  const openAddDrawer = () => {
    editRequest.current += 1;
    drawerForm.resetFields();
    drawerForm.setFieldsValue({
      name: '',
      remark: '',
      stageEnabled: 0,
      sourceIds: [],
      stageSourceIds: {},
    });
    setEditorSession(session => session + 1);
    setEditingPlan(undefined);
    setDrawerOpen(true);
  };

  const openEditDrawer = async (plan: GlobalFactorPreferencePlan) => {
    if (plan.published) {
      return;
    }
    const request = ++editRequest.current;
    const draft = await getGlobalFactorPreferencePlanInfo(plan.id);
    if (request !== editRequest.current || !draft) return;
    drawerForm.resetFields();
    drawerForm.setFieldsValue({
      name: draft.name,
      remark: draft.remark,
      stageEnabled: draft.stageEnabled,
      sourceIds:
        draft.stageEnabled === 0
          ? resolveSourceIdsByOptions(draft.sourceIds, sourceOptions)
          : [],
    });
    drawerForm.setFieldValue(
      'stageSourceIds',
      draft.stageEnabled === 1 ? draft.stageSourceIds : {},
    );
    setEditingPlan(plan);
    setEditorSession(session => session + 1);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (submitPending.current) return;
    editRequest.current += 1;
    setDrawerOpen(false);
    setEditingPlan(undefined);
    drawerForm.resetFields();
  };

  const submitDrawer = async () => {
    if (submitPending.current) return;
    submitPending.current = true;
    try {
      const values = await drawerForm.validateFields();
      setDrawerSubmitting(true);
      const payload = getPreferenceSaveValues(values, sourceOptions);
      if (editingPlan)
        await editGlobalFactorPreferencePlan(editingPlan.id, payload);
      else await addGlobalFactorPreferencePlan(payload);
      if (editingPlan) {
        await refreshPlans();
      } else {
        await loadPlans(1, planPagination.pageSize);
      }
      submitPending.current = false;
      closeDrawer();
    } finally {
      submitPending.current = false;
      setDrawerSubmitting(false);
    }
  };

  const openDetail = async (plan: GlobalFactorPreferencePlan) => {
    const request = ++detailRequest.current;
    setDetailPlan(plan);
    const detail = await getGlobalFactorPreferencePlanInfo(plan.id);
    if (request !== detailRequest.current || !detail) return;
    setDetailPlan(detail);
  };

  const changeDefaultPlan = async (plan: GlobalFactorPreferencePlan) => {
    if (!plan.published) {
      return;
    }

    try {
      await setDefaultGlobalFactorPreferencePlan(plan.id);
    } finally {
      await refreshPlans();
    }
  };

  const changePublishStatus = async (planId: number) => {
    try {
      await setGlobalFactorPreferencePublished(planId);
    } finally {
      await refreshPlans();
    }
  };

  const deletePlan = (plan: GlobalFactorPreferencePlan) => {
    if (plan.published) {
      return;
    }

    Modal.confirm({
      title: I18N.carbonFootprint.prompt,
      content: I18N.template(
        I18N.carbonFootprint3.confirmDeleteFactorPreferencePlan,
        {
          val1: plan.name,
        },
      ),
      icon: null,
      onOk: async () => {
        await deleteGlobalFactorPreferencePlan(plan.id);
        await loadPlans(
          plans.length === 1 && planPagination.pageNum > 1
            ? planPagination.pageNum - 1
            : planPagination.pageNum,
          planPagination.pageSize,
        );
      },
    });
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    loadPlans(
      pagination.current || 1,
      pagination.pageSize || planPagination.pageSize,
    ).catch(() => undefined);
  };

  const columns: ColumnsType<GlobalFactorPreferencePlan> = [
    {
      title: '',
      dataIndex: 'isDefault',
      width: 48,
      render: (_, record) => (
        <Radio
          checked={record.isDefault}
          disabled={!record.published}
          onChange={() => {
            changeDefaultPlan(record).catch(() => undefined);
          }}
        />
      ),
    },
    {
      title: I18N.carbonFootprint.name,
      dataIndex: 'name',
      width: 220,
      render: (_, record) => (
        <div className={styles.nameCell}>
          {record.isDefault && (
            <span className={styles.defaultTag}>
              {I18N.carbonFootprint3.factorPreferenceDefault}
            </span>
          )}
          <span className={styles.ellipsisText} title={record.name}>
            {record.name}
          </span>
        </div>
      ),
    },
    {
      title: I18N.carbonFootprint3.factorPreferenceSource,
      dataIndex: 'sourceNames',
      width: 280,
      ellipsis: true,
      render: (sourceNames, record) => (
        <Tooltip
          title={
            record.stageEnabled === 1 ? undefined : sourceNames || undefined
          }
        >
          <span>
            {record.stageEnabled === 1
              ? I18N.carbonFootprint3.configureSourcesByStage
              : getSourceNamesText(sourceNames)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: I18N.carbonFootprint3.factorPreferencePublished,
      dataIndex: 'published',
      width: 120,
      render: (_, record) => (
        <Switch
          checked={record.published}
          disabled={record.isDefault}
          onChange={() => {
            changePublishStatus(record.id).catch(() => undefined);
          }}
        />
      ),
    },
    {
      title: I18N.carbonFootprint.operation,
      dataIndex: 'operation',
      width: 180,
      render: (_, record) => (
        <div className={styles.operationCell}>
          <Button
            type='link'
            onClick={() => {
              openDetail(record).catch(() => undefined);
            }}
          >
            {I18N.carbonFootprint3.details}
          </Button>
          <Button
            type='link'
            disabled={record.published}
            onClick={() => {
              openEditDrawer(record).catch(() => undefined);
            }}
          >
            {I18N.carbonFootprint.edit}
          </Button>
          <Button
            type='link'
            disabled={record.published}
            className={styles.dangerButton}
            onClick={() => deletePlan(record)}
          >
            {I18N.carbonFootprint.delete}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={I18N.carbonFootprint3.globalFactorPreference}
        width={960}
        open={open}
        centered
        footer={null}
        className={styles.globalFactorPreferenceModal}
        onCancel={onClose}
      >
        <div className={styles.modalHeader}>
          <Button
            icon={<ProfileOutlined />}
            onClick={() => setManagerScope(scope)}
          >
            {I18N.customFactorReuse.manage}
          </Button>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={openAddDrawer}
          >
            {I18N.carbonFootprint3.addFactorPreferencePlan}
          </Button>
        </div>
        <Table<GlobalFactorPreferencePlan>
          rowKey='id'
          className={styles.preferenceTable}
          columns={columns}
          dataSource={plans}
          loading={plansLoading}
          pagination={{
            current: planPagination.pageNum,
            pageSize: planPagination.pageSize,
            total: planPagination.total,
            showSizeChanger: true,
            showTotal: total =>
              I18N.template(I18N.components.totalTota, { val1: total }),
          }}
          onChange={handleTableChange}
          tableLayout='fixed'
        />
      </Modal>
      <CustomDrawer
        title={
          editingPlan
            ? I18N.carbonFootprint3.editFactorPreferencePlan
            : I18N.carbonFootprint3.addFactorPreferencePlan
        }
        open={drawerOpen}
        width={760}
        destroyOnClose
        onClose={closeDrawer}
      >
        <div className={styles.drawerContent}>
          <Form
            form={drawerForm}
            disabled={drawerSubmitting}
            layout='vertical'
            colon={false}
            className={styles.drawerForm}
          >
            <Form.Item
              name='name'
              label={I18N.carbonFootprint.name}
              rules={[
                {
                  required: true,
                  message:
                    I18N.carbonFootprint3.pleaseEnterFactorPreferencePlanName,
                },
              ]}
            >
              <Input
                maxLength={100}
                showCount
                placeholder={
                  I18N.carbonFootprint3.pleaseEnterFactorPreferencePlanName
                }
              />
            </Form.Item>
            <Form.Item name='stageEnabled' hidden>
              <Input />
            </Form.Item>
            <Form.Item name='stageSourceIds' hidden />
            <Form.Item
              name='sourceIds'
              required={stageEnabled === 0}
              validateTrigger={[]}
              rules={[
                {
                  validator: (_, value?: SourceConfiguration['sourceIds']) =>
                    stageEnabled === 1 ||
                    resolveSourceIdsByOptions(value, sourceOptions).length > 0
                      ? Promise.resolve()
                      : Promise.reject(
                          new Error(
                            I18N.carbonFootprint3.pleaseSelectBackgroundDatabaseSource,
                          ),
                        ),
                },
              ]}
            >
              <SourceConfigurationField
                key={editorSession}
                stageEnabled={stageEnabled}
                stageSourceIds={stageSourceIds}
                onConfigurationChange={value => {
                  if (value.stageEnabled !== undefined)
                    drawerForm.setFieldValue(
                      'stageEnabled',
                      value.stageEnabled,
                    );
                  if (value.stageSourceIds !== undefined)
                    drawerForm.setFieldValue(
                      'stageSourceIds',
                      value.stageSourceIds,
                    );
                  drawerForm.setFields([{ name: 'sourceIds', errors: [] }]);
                }}
                onChange={() =>
                  drawerForm.setFields([{ name: 'sourceIds', errors: [] }])
                }
                options={sourceOptions}
                loading={sourceOptionsLoading}
                disabled={drawerSubmitting}
              />
            </Form.Item>
            <Form.Item name='remark' label={I18N.carbonFootprint.remarks}>
              <Input.TextArea
                maxLength={1000}
                showCount
                rows={4}
                placeholder={I18N.carbonFootprint3.pleaseEnterRemark}
              />
            </Form.Item>
          </Form>
          <div className={styles.drawerFooter}>
            <Button onClick={closeDrawer}>{I18N.carbonFootprint.cancel}</Button>
            <Button
              type='primary'
              loading={drawerSubmitting}
              onClick={() => {
                submitDrawer().catch(() => undefined);
              }}
            >
              {I18N.carbonFootprint.preserve}
            </Button>
          </div>
        </div>
      </CustomDrawer>
      <Modal
        title={I18N.carbonFootprint3.factorPreferencePlanDetail}
        width={860}
        open={!!detailPlan}
        centered
        footer={null}
        className={styles.detailModal}
        onCancel={() => {
          detailRequest.current += 1;
          setDetailPlan(undefined);
        }}
      >
        {detailPlan && (
          <div className={styles.detailContent}>
            <Descriptions
              bordered
              column={1}
              className={
                detailPlan.stageEnabled === 1 ? styles.stageDetail : undefined
              }
            >
              <Descriptions.Item label={I18N.carbonFootprint.name}>
                <span className={styles.detailText}>{detailPlan.name}</span>
              </Descriptions.Item>
              <Descriptions.Item
                label={I18N.carbonFootprint3.backgroundDatabaseSource}
              >
                {detailPlan.stageEnabled === 1 ? (
                  <SourceConfigurationField
                    key={detailPlan.id}
                    value={detailPlan.sourceIds}
                    stageEnabled={detailPlan.stageEnabled}
                    stageSourceIds={detailPlan.stageSourceIds}
                    stageSourceItems={detailPlan.stageSourceItems}
                    options={sourceOptions}
                    readOnly
                  />
                ) : (
                  <span className={styles.detailText}>
                    {getSourceNamesText(detailPlan.sourceNames)}
                  </span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={I18N.carbonFootprint.remarks}>
                <span className={styles.detailText}>
                  {detailPlan.remark || '-'}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
      {open && managerScope === scope && (
        <SavedFactorManager
          service={savedFactorService}
          onClose={() => setManagerScope(undefined)}
        />
      )}
    </>
  );
};

export default GlobalFactorPreference;
