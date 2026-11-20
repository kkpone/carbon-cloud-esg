import { ExclamationCircleFilled } from '@ant-design/icons';
import {
  Alert,
  Button,
  Form,
  message,
  Modal,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';

import I18N from '@/lang/I18N';

import confirmStyles from '../../../deleteConfirm.module.less';
import {
  getMonitorAssociatedBusiness,
  pushMonitorBusiness,
} from '../../../service';
import { MonitorAssociatedBusiness, MonitorBusinessType } from '../../../types';
import styles from './index.module.less';

interface AssociatedBusinessProps {
  /** 已保存的计划ID；推送数据由后端读取。 */
  planId: number | string;
  /** 保存计划或凭证后刷新版本差异。 */
  planDataVersion?: number;
  /** 只读宿主只展示关联信息。 */
  readonly?: boolean;
}

/** 关联业务独立加载，推送确认只发送目标ID，不携带计划表单草稿。 */
export default function AssociatedBusiness({
  planId,
  planDataVersion,
  readonly,
}: AssociatedBusinessProps) {
  const [businessType, setBusinessType] =
    useState<MonitorBusinessType>('accounting-tasks');
  const [rows, setRows] = useState<MonitorAssociatedBusiness[]>([]);
  const [selectedIds, setSelectedIds] = useState<React.Key[]>([]);
  const [loading, setLoading] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [failed, setFailed] = useState(false);

  /** 加载失败显式展示重试，不把接口失败视为空列表。 */
  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await getMonitorAssociatedBusiness(planId, businessType);
      setRows(data.data || []);
      setSelectedIds([]);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [planId, businessType]);

  useEffect(() => {
    setRows([]);
    setSelectedIds([]);
    load();
  }, [load, planDataVersion]);

  /** 取消不写入，确认成功后刷新状态；失败保留弹框和选择以便重试。 */
  const confirmPush = (ids: React.Key[]) => {
    Modal.confirm({
      className: confirmStyles.deleteConfirmModal,
      wrapClassName: confirmStyles.deleteConfirmWrap,
      centered: true,
      width: 444,
      icon: null,
      closable: true,
      title: I18N.cbamMonitor.confirmBusinessPush,
      content: (
        <div
          className={`${confirmStyles.deleteConfirmContent} ${styles.pushConfirmContent}`}
        >
          <ExclamationCircleFilled
            className={confirmStyles.deleteConfirmIcon}
          />
          <span>{I18N.cbamMonitor.businessPushWarning}</span>
        </div>
      ),
      okText: I18N.cbamMonitor.confirm,
      cancelText: I18N.cbamMonitor.cancel,
      onOk: async () => {
        setPushing(true);
        try {
          await pushMonitorBusiness(planId, businessType, ids.map(Number));
          message.success(I18N.cbamMonitor.businessPushSucceeded);
          await load();
        } catch (error) {
          message.error(I18N.cbamMonitor.businessPushFailed);
          throw error;
        } finally {
          setPushing(false);
        }
      },
    });
  };

  const isAccounting = businessType === 'accounting-tasks';
  const columns: ColumnsType<MonitorAssociatedBusiness> = [
    {
      title: isAccounting
        ? I18N.cbamMonitor.linkedAccountingName
        : I18N.cbamMonitor.linkedReportName,
      dataIndex: 'reportName',
      width: 260,
      render: value => value || '-',
    },
    ...(!isAccounting
      ? [
          {
            title: I18N.cbamMonitor.linkedReportVersion,
            dataIndex: 'versionNo',
            width: 110,
          },
        ]
      : []),
    {
      title: isAccounting
        ? I18N.cbamMonitor.linkedAccountingPeriod
        : I18N.cbamMonitor.linkedReportPeriod,
      width: 240,
      render: (_, row) =>
        I18N.template(I18N.cbamMonitor.linkedBusinessPeriod, {
          start: row.startDate || '-',
          end: row.endDate || '-',
        }),
    },
    isAccounting
      ? {
          title: I18N.cbamMonitor.linkedCbamProducts,
          dataIndex: 'cbamProducts',
          width: 220,
          render: value => value || '-',
        }
      : {
          title: I18N.cbamMonitor.linkedSubmitTarget,
          dataIndex: 'submitTarget',
          width: 180,
          render: value => value || '-',
        },
    {
      title: I18N.cbamMonitor.linkedBusinessStatus,
      width: 120,
      render: (_, row) => {
        const completed = isAccounting ? row.completed : row.status === 1;
        return (
          <Tag color={completed ? 'success' : 'default'}>
            {completed
              ? I18N.cbamMonitor.linkedBusinessCompleted
              : isAccounting
              ? I18N.cbamMonitor.linkedAccountingFilling
              : I18N.cbamMonitor.linkedReportFilling}
          </Tag>
        );
      },
    },
    {
      title: I18N.cbamMonitor.linkedSyncStatus,
      width: 120,
      render: (_, row) => (
        <Tag color={row.needsSync ? 'warning' : 'success'}>
          {row.needsSync
            ? I18N.cbamMonitor.businessPendingPush
            : I18N.cbamMonitor.businessUpToDate}
        </Tag>
      ),
    },
    ...(!readonly
      ? [
          {
            title: I18N.cbamMonitor.linkedBusinessActions,
            width: 100,
            fixed: 'right' as const,
            render: (_: unknown, row: MonitorAssociatedBusiness) => (
              <Button
                type='link'
                disabled={!row.needsSync || pushing || loading || failed}
                onClick={() => confirmPush([row.id])}
              >
                {I18N.cbamMonitor.pushBusiness}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Form component={false} disabled={false}>
      <section className={styles.wrapper}>
        <Tabs
          activeKey={businessType}
          onChange={key => setBusinessType(key as MonitorBusinessType)}
          items={[
            {
              key: 'accounting-tasks',
              label: I18N.cbamMonitor.linkedAccounting,
              disabled: pushing || loading,
            },
            {
              key: 'operation-reports',
              label: I18N.cbamMonitor.linkedReports,
              disabled: pushing || loading,
            },
          ]}
        />
        {failed && (
          <Alert
            type='error'
            showIcon
            message={I18N.cbamMonitor.businessListLoadFailed}
            action={
              <Button onClick={load}>
                {I18N.cbamMonitor.retryBusinessList}
              </Button>
            }
          />
        )}
        {!readonly && (
          <div className={styles.toolbar}>
            <span>
              {I18N.template(I18N.cbamMonitor.selectedBusinessCount, {
                count: selectedIds.length,
              })}
            </span>
            <Space>
              <Button
                type='primary'
                disabled={!selectedIds.length || loading || failed}
                loading={pushing}
                onClick={() => confirmPush(selectedIds)}
              >
                {I18N.cbamMonitor.batchPushBusiness}
              </Button>
            </Space>
          </div>
        )}
        <Table<MonitorAssociatedBusiness>
          rowKey='id'
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          rowSelection={
            readonly
              ? undefined
              : {
                  selectedRowKeys: selectedIds,
                  onChange: setSelectedIds,
                  getCheckboxProps: row => ({
                    disabled: !row.needsSync || pushing || failed,
                  }),
                }
          }
        />
      </section>
    </Form>
  );
}
