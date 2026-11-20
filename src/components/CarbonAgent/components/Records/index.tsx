import I18N from '@/lang/I18N';
import { useEffect, useId, useState } from 'react';
import {
  Alert,
  Button,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  DatePicker,
} from 'antd';
import dayjs from 'dayjs';
import { useModelNavigation } from '../../useModelNavigation';
import { api } from '../../api';
import { useCarbonAgent } from '../../context';
import { text } from '../../protocol';
import type { Data } from '../../protocol';
import styles from './index.module.less';

export default function Records({ onClose }: { onClose: () => void }) {
  const organizationLabelId = useId();
  const agent = useCarbonAgent();
  const navigation = useModelNavigation();
  const [query, setQuery] = useState({
    keyword: '',
    status: '',
    start: '',
    end: '',
    pageNum: 1,
    organization: false,
  });
  const [result, setResult] = useState<{ rows: Data[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      channel: 'CARBON',
      pageSize: '20',
      pageNum: String(query.pageNum),
      organization: String(
        query.organization && agent.access?.canManage === true,
      ),
    });
    for (const key of ['keyword', 'status', 'start', 'end'] as const)
      if (query[key]) params.set(key, query[key]);
    api<{ rows: Data[]; total: number }>(
      `/management/agent/modeling/records?${params}`,
      undefined,
      abort.signal,
    )
      .then(setResult)
      .catch(cause => {
        if (!abort.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [query, agent.revision]);
  const statuses: Record<string, string> = {
    RUNNING: I18N.carbonAgent.running,
    WAITING: I18N.carbonAgent.waiting,
    SUCCESS: I18N.carbonAgent.success,
    FAILED: I18N.carbonAgent.failed,
    CANCELLED: I18N.carbonAgent.cancelled,
  };
  return (
    <Modal
      title={I18N.carbonAgent.recordsTitle}
      open
      zIndex={2300}
      width={900}
      footer={null}
      onCancel={onClose}
    >
      <div className={styles.filters}>
        <Input.Search
          placeholder={I18N.carbonAgent.recordsSearch}
          allowClear
          onSearch={keyword =>
            setQuery(value => ({ ...value, keyword, pageNum: 1 }))
          }
        />
        <Select
          placeholder={I18N.carbonAgent.allStatuses}
          allowClear
          options={['RUNNING', 'WAITING', 'SUCCESS', 'FAILED', 'CANCELLED'].map(
            value => ({ label: statuses[value], value }),
          )}
          onChange={status =>
            setQuery(value => ({ ...value, status: status || '', pageNum: 1 }))
          }
        />
        <DatePicker.RangePicker
          disabledDate={date => date.valueOf() > dayjs().endOf('day').valueOf()}
          onChange={value => {
            if (
              value?.[0] &&
              value[1] &&
              dayjs(value[1].format('YYYY-MM-DD')).diff(
                dayjs(value[0].format('YYYY-MM-DD')),
                'day',
              ) >= 90
            ) {
              setError(I18N.carbonAgent.dateRangeLimit);
              return;
            }
            setQuery(previous => ({
              ...previous,
              start: value?.[0]?.format('YYYY-MM-DD') || '',
              end: value?.[1]?.format('YYYY-MM-DD') || '',
              pageNum: 1,
            }));
          }}
        />
        {agent.access?.canManage && (
          <div>
            <span id={organizationLabelId}>
              {I18N.carbonAgent.organizationRecords}
            </span>{' '}
            <Switch
              aria-labelledby={organizationLabelId}
              checked={query.organization}
              onChange={organization =>
                setQuery(value => ({ ...value, organization, pageNum: 1 }))
              }
            />
          </div>
        )}
      </div>
      {(error || navigation.error) && (
        <Alert type='error' message={error || navigation.error} />
      )}
      <Table<Data>
        loading={loading}
        rowKey={row => text(row.recordId || row.runId)}
        dataSource={result.rows}
        scroll={{ x: 700 }}
        pagination={{
          current: query.pageNum,
          total: result.total,
          pageSize: 20,
          showSizeChanger: false,
          onChange: pageNum => setQuery(value => ({ ...value, pageNum })),
        }}
        columns={[
          {
            title: I18N.carbonAgent.model,
            dataIndex: 'modelName',
            render: value => text(value) || '—',
          },
          { title: I18N.carbonAgent.member, dataIndex: 'memberName' },
          {
            title: I18N.carbonAgent.status,
            dataIndex: 'status',
            render: value => statuses[text(value)] || text(value),
          },
          { title: I18N.carbonAgent.actualPoints, dataIndex: 'actualPoints' },
          { title: I18N.carbonAgent.startTime, dataIndex: 'startTime' },
          {
            title: I18N.carbonAgent.actions,
            render: (_, row) =>
              row.accountId ? (
                <Button
                  type='link'
                  loading={navigation.loading}
                  onClick={() =>
                    navigation.open(text(row.accountId), text(row.productId))
                  }
                >
                  {I18N.carbonAgent.viewModel}
                </Button>
              ) : (
                '—'
              ),
          },
        ]}
      />
    </Modal>
  );
}
