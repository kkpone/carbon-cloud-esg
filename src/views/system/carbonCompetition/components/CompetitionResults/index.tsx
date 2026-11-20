import { copyToClipboard } from '@/utils/clipboard';
import I18N from '@src/lang/I18N';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  createCompetitionPoster,
  getCompetitionPoster,
  getCompetitionResults,
} from '../../service';
import type {
  Me,
  Overview,
  Poster,
  PreliminaryResult,
  PublishedResults,
} from '../../types';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
export default function CompetitionResults({
  event,
  me,
}: {
  event: Overview;
  me?: Me;
}) {
  const location = useLocation();
  const [batch, setBatch] = useState<PublishedResults>();
  const [poster, setPoster] = useState<Poster>();
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }, []);
  const load = useCallback(async () => {
    const params = new URLSearchParams(location.search);
    setBatch(
      await getCompetitionResults(
        event.code,
        params.get('kind') === 'CHECKIN'
          ? undefined
          : params.get('batchId') || undefined,
      ),
    );
    const share = params.get('shareCode');
    if (share)
      setPoster(
        await getCompetitionPoster(event.code, share, {
          kind: params.get('kind') || 'RESULT',
          batchId: params.get('batchId') || '',
          inviteCode: params.get('inviteCode') || undefined,
        }),
      );
  }, [event.code, location.search]);
  useEffect(() => {
    run(load);
  }, [run, load]);
  const share = (subjectType: string) => {
    const promise = createCompetitionPoster(event.id, {
      kind: 'RESULT',
      subjectType,
      batchId: batch?.id,
    }).then(p => {
      setPoster(p);
      return p.shareUrl!;
    });
    copyToClipboard(promise).catch(e =>
      setError(e instanceof Error ? e.message : t.failed),
    );
  };
  const columns = [
    { title: t.resultSubject, dataIndex: 'displayName' },
    { title: t.rank, dataIndex: 'ranking' },
    {
      title: t.resultC,
      render: (_: unknown, row: PreliminaryResult) => row.cScore ?? '—',
    },
    {
      title: t.resultE,
      render: (_: unknown, row: PreliminaryResult) => row.eScore ?? '—',
    },
    {
      title: t.resultBonus,
      render: (_: unknown, row: PreliminaryResult) =>
        row.bonusRate === undefined ? '—' : `${Number(row.bonusRate) * 100}%`,
    },
    {
      title: t.resultTotal,
      render: (_: unknown, row: PreliminaryResult) => row.totalScore ?? '—',
    },
  ];
  return (
    <section className={styles.panel}>
      {error && <Alert type='error' message={error} showIcon />}
      <Space wrap>
        <Button loading={busy} onClick={() => run(load)}>
          {t.retry}
        </Button>
        {batch?.publishedAt && (
          <span>
            {t.publishedAt}:{' '}
            {dayjs(batch.publishedAt).format('YYYY-MM-DD HH:mm:ss')} ·{' '}
            {t.resultVersion} {batch.batchVersion}
          </span>
        )}
      </Space>
      {!batch?.id ? (
        <Alert type='info' message={t.notPublished} />
      ) : (
        <>
          <Alert type='info' message={t.preliminaryOnly} />
          <div className={styles.boards}>
            {(['TEAM', 'PARTICIPANT'] as const).map(type => (
              <Card
                key={type}
                title={
                  type === 'TEAM' ? t.enterpriseQualified : t.individualWinners
                }
              >
                <Table<PreliminaryResult>
                  rowKey='subjectId'
                  dataSource={batch.results.filter(
                    row => row.subjectType === type && row.qualified === 1,
                  )}
                  columns={columns}
                  pagination={false}
                  scroll={{ x: 650 }}
                />
              </Card>
            ))}
          </div>
          <Card title={t.allPublishedResults}>
            <Input.Search
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={t.searchLeaderboard}
              allowClear
            />
            <Table<PreliminaryResult>
              rowKey={r => `${r.subjectType}:${r.subjectId}`}
              dataSource={batch.results.filter(
                r =>
                  r.displayName.includes(keyword) ||
                  r.teamNameSnapshot?.includes(keyword),
              )}
              columns={[
                ...columns,
                {
                  title: t.resultConclusion,
                  render: (_, r) =>
                    r.qualified === 1 ? t.qualified : t.notQualified,
                },
              ]}
              scroll={{ x: 700 }}
              pagination={{ pageSize: 20, showSizeChanger: false }}
            />
            {me?.participant && (
              <Space wrap>
                <Button onClick={() => share('PARTICIPANT')}>
                  {t.shareMyResult}
                </Button>
                {me.team && (
                  <Button onClick={() => share('TEAM')}>
                    {t.shareTeamResult}
                  </Button>
                )}
              </Space>
            )}
          </Card>
        </>
      )}
      <Modal
        open={!!poster}
        title={t.fixedBatchShare}
        footer={null}
        onCancel={() => setPoster(undefined)}
      >
        {poster && (
          <div className={styles.poster}>
            <h3>{poster.result?.displayName || poster.checkin?.name}</h3>
            <Descriptions column={1}>
              <Descriptions.Item
                label={poster.result ? t.resultTotal : t.checkinPoints}
              >
                {poster.result?.totalScore ?? poster.checkin?.points ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t.rank}>
                {poster.result?.ranking ?? poster.checkin?.rank ?? '—'}
              </Descriptions.Item>
              {poster.result && (
                <>
                  <Descriptions.Item label={t.resultC}>
                    {poster.result.cScore}
                  </Descriptions.Item>
                  <Descriptions.Item label={t.resultE}>
                    {poster.result.eScore}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
            {poster.inviteUrl && /^https?:\/\//i.test(poster.inviteUrl) && (
              <>
                <QRCodeSVG value={poster.inviteUrl} size={180} />
                <a href={poster.inviteUrl}>
                  {poster.inviteEnabled ? t.register : t.intro}
                </a>
              </>
            )}
            {!poster.inviteEnabled && (
              <Alert type='info' message={t.shareInviteClosed} />
            )}
            <Button
              onClick={() =>
                copyToClipboard(poster.shareUrl || window.location.href).catch(
                  e => setError(e instanceof Error ? e.message : t.failed),
                )
              }
            >
              {t.copyShareLink}
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
}
