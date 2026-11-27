import I18N from '@src/lang/I18N';
import { ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Radio, Spin, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState } from 'react';
import {
  assignCompetitionPaper,
  call,
  downloadCompetitionPaper,
  getCompetitionTasks,
  mutation,
  prefix,
  statusLabel,
} from '../../service';
import type {
  FinalMaterial,
  FinalTaskCode,
  Me,
  Overview,
  Task,
} from '../../types';
import CompetitionCheckin from '../CompetitionCheckin';
import MaterialSubmission from './components/MaterialSubmission';
import TeamTaskProgress from './components/TeamTaskProgress';
import FinalMaterialForm from './components/FinalMaterialForm';
import TaskRankingDock from './components/TaskRankingDock';
import { canSubmitModule, phaseStatus, taskModules } from './taskAccess';
import type { TaskModule } from './taskAccess';
import lockIcon from '@/assets/images/carbonCompetition/task-lock.svg';
import warningIcon from '@/assets/images/carbonCompetition/task-warning.svg';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const u = t.taskUi;
const english = {
  C: 'Calculating',
  R: 'Reducing',
  E: 'Engaging',
  O: 'Offsetting',
  S: 'Spreading',
};
const formatTime = (value?: string) =>
  value ? dayjs(value).format('YYYY-MM-DD HH:mm') : t.pending;
export default function CompetitionTasks({
  event,
  me,
  initialModule = 'C',
  onRegister,
}: {
  event: Overview;
  me?: Me;
  initialModule?: TaskModule;
  onRegister: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finals, setFinals] = useState<
    Partial<Record<FinalTaskCode, FinalMaterial>>
  >({});
  const [module, setModule] = useState<TaskModule>(initialModule);
  const [view, setView] = useState('submit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const eligible =
    !!me?.participant &&
    me.participant.status === 'REGISTERED' &&
    me.participant.eligible !== false;
  const enterprise = me?.participant?.track === 'ENTERPRISE';
  const load = useCallback(async () => {
    const items = await getCompetitionTasks(event.id);
    setTasks(items);
    if (enterprise) {
      const rows = await Promise.all(
        (['R', 'O', 'S'] as const).map(code =>
          call<FinalMaterial>(`${prefix(event.id)}/final-materials/${code}`),
        ),
      );
      setFinals(Object.fromEntries(rows.map(row => [row.taskCode, row])));
    } else setFinals({});
  }, [event.id, enterprise]);
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    setModule(
      !enterprise && ['R', 'O', 'S'].includes(initialModule)
        ? 'C'
        : initialModule,
    );
  }, [initialModule, enterprise]);
  useEffect(() => {
    setTasks([]);
    setFinals({});
    if (eligible) run(load);
  }, [eligible, load, me?.participant?.id]);
  const finalModule = module === 'R' || module === 'O' || module === 'S';
  const cardStatus = (code: TaskModule) => {
    if (code === 'C') {
      if (
        tasks.length === 2 &&
        tasks.every(task => task.status === 'SUBMITTED')
      )
        return 'SUBMITTED';
      if (tasks.some(task => task.status === 'SUBMITTED')) return 'PARTIAL';
      if (tasks.some(task => task.status === 'SNAPSHOTTING'))
        return 'SNAPSHOTTING';
      if (tasks.some(task => task.status === 'DRAFT')) return 'DRAFT';
      return tasks.some(task => task.phaseStatus === 'OPEN')
        ? 'OPEN'
        : tasks[0]?.phaseStatus || 'NOT_OPEN';
    }
    if (code === 'E')
      return phaseStatus(
        event.phases.find(phase => phase.code === 'E_CHECKIN'),
      );
    return finals[code]?.status === 'SUBMITTED'
      ? 'SUBMITTED'
      : finals[code]?.phaseStatus ||
          phaseStatus(event.phases.find(phase => phase.code === 'FINAL'));
  };
  return (
    <section className={styles.panel}>
      <div className={styles.modules} aria-label={t.tasks}>
        {taskModules.map(code => {
          const allowed = canSubmitModule(me, code);
          const state = cardStatus(code);
          return (
            <button
              type='button'
              key={code}
              className={`${styles.module} ${
                module === code ? styles.selected : ''
              } ${
                !allowed && code !== 'C' && code !== 'E'
                  ? styles.restricted
                  : ''
              }`}
              disabled={!enterprise && code !== 'C' && code !== 'E'}
              aria-pressed={module === code}
              onClick={() => {
                setModule(code);
                setView('submit');
              }}
            >
              <span className={styles.moduleHeading}>
                <span className={styles.english}>{english[code]}</span>
                <strong>{u[code]}</strong>
              </span>
              <span className={styles.description}>{u[`${code}Desc`]}</span>
              <span className={styles.cardStatus}>
                {!allowed && code !== 'C' && code !== 'E' ? (
                  <>
                    <img src={lockIcon} width={16} height={16} alt='' />
                    {enterprise ? u.captainBadge : u.enterpriseBadge}
                  </>
                ) : (
                  <Tag
                    bordered={false}
                    className={
                      state === 'SUBMITTED'
                        ? styles.done
                        : state === 'OPEN'
                        ? code === 'E'
                          ? styles.ongoing
                          : styles.pending
                        : state === 'DRAFT'
                        ? styles.draft
                        : styles.neutral
                    }
                  >
                    {state === 'SUBMITTED'
                      ? u.completed
                      : state === 'PARTIAL'
                      ? u.partial
                      : state === 'NOT_OPEN' || state === 'NOT_STARTED'
                      ? u.notOpen
                      : state === 'OPEN'
                      ? code === 'E'
                        ? u.active
                        : u.notStarted
                      : statusLabel(state)}
                  </Tag>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {!eligible ? (
        <Alert
          className={styles.registrationNotice}
          type='info'
          message={
            me?.participant && me.participant.status !== 'PROFILE_ONLY'
              ? t.taskRegistrationPending
              : t.taskRegistrationRequired
          }
          description={t.taskRegistrationHint}
          action={
            <Button
              disabled={!event.registrationAvailable}
              onClick={onRegister}
            >
              {t.design.registerNow}
            </Button>
          }
        />
      ) : (
        <>
          {module === 'C' && (
            <div className={styles.toolbar}>
              <div
                className={styles.tabs}
                role='tablist'
                aria-label={u.submission}
              >
                {[
                  ['submit', u.submission],
                  ['progress', u.progress],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type='button'
                    role='tab'
                    aria-selected={view === key}
                    className={view === key ? styles.activeTab : ''}
                    onClick={() => setView(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                type='text'
                icon={<ReloadOutlined />}
                loading={busy}
                onClick={() => run(load)}
              >
                {t.retry}
              </Button>
            </div>
          )}
          {error && <Alert type='error' showIcon message={error} />}
          {module === 'C' && (
            <Spin spinning={busy} tip={u.loading}>
              <div className={styles.taskBody}>
                {view === 'submit' && (
                  <div className={styles.notice}>
                    <img src={warningIcon} width={16} height={16} alt='' />
                    <span>{u.deadlineHint}</span>
                  </div>
                )}
                <div
                  className={
                    view === 'progress' && me?.team
                      ? styles.progress
                      : styles.calculations
                  }
                >
                  {view === 'progress' && me?.team ? (
                    <TeamTaskProgress eventId={event.id} teamId={me.team.id} />
                  ) : (
                    tasks.map(task => {
                      const phase = event.phases.find(
                        item => item.code === task.taskCode,
                      );
                      const questionReady =
                        !!task.questionReleaseAt &&
                        !dayjs().isBefore(dayjs(task.questionReleaseAt));
                      let downloadReason = '';
                      if (event.status !== 'OPEN') {
                        downloadReason = u.downloadEventClosed;
                      } else if (!phase?.enabled) {
                        downloadReason = u.downloadTaskClosed;
                      } else if (
                        !phase.confirmed ||
                        !phase.opensAt ||
                        !phase.closesAt
                      ) {
                        downloadReason = u.downloadSchedulePending;
                      } else if (!task.questionReleaseAt) {
                        downloadReason = u.downloadReleasePending;
                      } else if (!questionReady) {
                        downloadReason = I18N.template(u.downloadNotReleased, {
                          time: formatTime(task.questionReleaseAt),
                        });
                      } else if (task.dataSource !== 'STANDARD') {
                        downloadReason = u.downloadChooseStandard;
                      } else if (
                        !task.assignmentId ||
                        !task.downloadAvailable
                      ) {
                        downloadReason = u.downloadNotAssigned;
                      }
                      const editable =
                        view === 'submit' &&
                        canSubmitModule(me, 'C') &&
                        !!phase?.enabled &&
                        !!phase.confirmed &&
                        questionReady &&
                        !!task.closesAt &&
                        dayjs().isBefore(dayjs(task.closesAt)) &&
                        ['NOT_STARTED', 'DRAFT'].includes(task.status);
                      return (
                        <article className={styles.task} key={task.taskCode}>
                          <header className={styles.taskHeading}>
                            <h3>
                              {task.taskCode === 'C_PRODUCT'
                                ? u.product
                                : u.enterprise}
                            </h3>
                            {task.dataSource !== 'OWN' && (
                              <Tooltip title={downloadReason}>
                                <span className={styles.downloadTrigger}>
                                  <Button
                                    disabled={busy || !!downloadReason}
                                    icon={
                                      <span
                                        className={styles.downloadIcon}
                                        aria-hidden='true'
                                      />
                                    }
                                    onClick={() =>
                                      run(async () => {
                                        const result =
                                          await downloadCompetitionPaper(
                                            event.id,
                                            task.assignmentId!,
                                            mutation(event.code),
                                          );
                                        window.location.assign(result.url);
                                        await load();
                                      })
                                    }
                                  >
                                    {t.downloadPaper}
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                          </header>
                          <p className={styles.schedule}>
                            <span
                              className={styles.clockIcon}
                              aria-hidden='true'
                            />
                            <span>
                              {I18N.template(u.schedule, {
                                start: formatTime(task.opensAt),
                                end: formatTime(task.closesAt),
                              })}
                            </span>
                          </p>
                          <div className={styles.sourceRow}>
                            <span>{t.dataSource}</span>
                            <Radio.Group
                              value={task.dataSource}
                              disabled={busy || !editable}
                              onChange={e =>
                                run(async () => {
                                  await assignCompetitionPaper(
                                    event.id,
                                    task.taskCode,
                                    {
                                      ...mutation(
                                        event.code,
                                        task.assignmentVersion,
                                      ),
                                      dataSource: e.target.value,
                                    },
                                  );
                                  await load();
                                })
                              }
                              options={[
                                {
                                  value: 'STANDARD',
                                  label: enterprise
                                    ? u.organizer
                                    : u.individualOrganizer,
                                },
                                ...(enterprise
                                  ? [{ value: 'OWN', label: u.own }]
                                  : []),
                              ]}
                            />
                          </div>
                          <MaterialSubmission
                            event={event}
                            task={task}
                            reload={load}
                            readOnly={view === 'progress'}
                          />
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </Spin>
          )}
          {module === 'E' &&
            (cardStatus('E') === 'NOT_OPEN' ? (
              <Alert type='info' showIcon message={u.checkinNotOpen} />
            ) : (
              <CompetitionCheckin event={event} me={me} />
            ))}
          {finalModule &&
            (!enterprise ? (
              <Alert type='info' showIcon message={u.enterpriseOnly} />
            ) : (
              <FinalMaterialForm
                key={`${event.id}:${module}:${me?.participant?.id}`}
                event={event}
                task={module}
                material={finals[module]}
                canSubmit={canSubmitModule(me, module)}
                reload={load}
              />
            ))}
        </>
      )}
      <TaskRankingDock event={event} me={me} />
    </section>
  );
}
