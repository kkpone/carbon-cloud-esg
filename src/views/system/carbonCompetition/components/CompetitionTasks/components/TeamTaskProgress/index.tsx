import I18N from '@src/lang/I18N';
import { Alert, Button, Space, Table, Tag } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  openCompetitionResult,
  getCompetitionTeamTasks,
  statusLabel,
} from '../../../../service';
import type { MemberTasks } from '../../../../types';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
export default function TeamTaskProgress({
  eventId,
  teamId,
}: {
  eventId: string;
  teamId: string;
}) {
  const [rows, setRows] = useState<MemberTasks[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setRows(await getCompetitionTeamTasks(eventId, teamId));
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }, [eventId, teamId]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <section className={styles.panel}>
      <header>
        <h3>{t.teamTaskProgress}</h3>
        <Button type='text' loading={busy} onClick={load}>
          {t.retry}
        </Button>
      </header>
      {error && <Alert type='error' message={error} />}
      <p>{t.teamTaskHint}</p>
      <Table
        loading={busy}
        rowKey='participantId'
        dataSource={rows}
        pagination={false}
        scroll={{ x: 600 }}
        columns={[
          { title: t.participantLabel, dataIndex: 'realName' },
          { title: t.role, dataIndex: 'role', render: statusLabel },
          ...(['C_PRODUCT', 'C_ENTERPRISE'] as const).map(code => ({
            title: code === 'C_PRODUCT' ? t.productTask : t.enterpriseTask,
            key: code,
            render: (_: unknown, row: MemberTasks) => {
              const task = row.tasks.find(item => item.taskCode === code);
              return (
                <Space wrap>
                  <Tag
                    bordered={false}
                    className={styles[task?.status || 'NOT_STARTED']}
                  >
                    {task?.status === 'DRAFT'
                      ? t.design.taskDraft
                      : statusLabel(task?.status)}
                  </Tag>
                  {task?.status === 'SUBMITTED' && task.submissionId && (
                    <Button
                      disabled={busy}
                      size='small'
                      type='link'
                      onClick={async () => {
                        setBusy(true);
                        setError('');
                        try {
                          await openCompetitionResult(
                            eventId,
                            task.submissionId!,
                          );
                        } catch (e) {
                          setError(e instanceof Error ? e.message : t.failed);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {t.viewSnapshot}
                    </Button>
                  )}
                </Space>
              );
            },
          })),
        ]}
      />
    </section>
  );
}
