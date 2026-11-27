import { useMobile } from '@/hooks/use-mobile';
import { getToken } from '@/utils/cookie';
import type { RootState } from '@/store';
import { useSelector } from 'react-redux';
import AgentLoginDialog from '@/views/system/carbonAgent/components/AgentLoginDialog';
import I18N from '@/lang/I18N';
import { Alert, Button, ConfigProvider, Collapse, Spin, message } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Link as RouterLink,
  useHistory,
  useLocation,
  useParams,
} from 'react-router-dom';
import CompetitionLeaderboard from './components/CompetitionLeaderboard';
import CompetitionFullRanking from './components/CompetitionFullRanking';
import CompetitionResults from './components/CompetitionResults';
import CompetitionTasks from './components/CompetitionTasks';
import CompetitionContacts from './components/CompetitionContacts';
import CompetitionIntroduction from './components/CompetitionIntroduction';
import CompetitionSidebar from './components/CompetitionSidebar';
import RegistrationForm from './components/RegistrationForm';
import IndividualRegistration from './components/IndividualRegistration';
import RegistrationSummary from './components/RegistrationSummary';
import TeamRoster from './components/TeamRoster';
import InvitationDialog from './components/InvitationDialog';
import TrackCards from './components/TrackCards';
import type { RegistrationTrack } from './components/TrackCards';
import { competitionAssets as assets } from './assets';
import styles from './index.module.less';
import {
  call,
  getCompetitionResults,
  mutation,
  openInvitation,
  overview,
  prefix,
} from './service';
import { invitationHint } from './invitationHint';
import type { Benefit, Invite, Landing, Me, Overview, Page } from './types';
import {
  clearInvitationReceipt,
  finishInvitationRestore,
  invitationOwner,
  restoreInvitation,
} from './invitation';

const t = I18N.carbonCompetition;
const d = t.design;
export default function CompetitionPage() {
  const { code = 'current' } = useParams<{ code: string }>();
  const location = useLocation();
  const history = useHistory();
  const mobile = useMobile();
  const accountSession = useSelector(
    (state: RootState) =>
      `${state.companyUserInfo.userInfo?.userId || ''}:${
        state.companyUserInfo.access_token || ''
      }`,
  );
  const loadRevision = useRef(0);
  const meToken = useRef<string>();
  const [event, setEvent] = useState<Overview>();
  const [publishedResultsCode, setPublishedResultsCode] = useState<string>();
  const [me, setMe] = useState<Me>();
  const [landing, setLanding] = useState<Landing>();
  const [invites, setInvites] = useState<Page<Invite>>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [track, setTrack] = useState<RegistrationTrack>();
  const [rosterVisible, setRosterVisible] = useState(false);
  const [invitationStep, setInvitationStep] = useState<
    'welcome' | 'login' | 'choice' | 'confirm'
  >();
  const contentRef = useRef<HTMLDivElement>(null);
  const query = new URLSearchParams(location.search);
  const homeQuery = new URLSearchParams(location.search);
  homeQuery.set('compTab', 'intro');
  const inviteCode = query.get('inviteCode');
  const resultsAvailable = publishedResultsCode === code;
  const requestedTab =
    query.get('compTab') === 'submit'
      ? 'tasks'
      : query.get('compTab') || 'intro';
  const tab =
    [
      'intro',
      'register',
      'tasks',
      'checkin',
      'leaderboard',
      'fullRanking',
      'results',
    ].includes(requestedTab) &&
    (requestedTab !== 'results' || resultsAvailable)
      ? requestedTab
      : 'intro';
  const changeTab = useCallback(
    (next: string) => {
      const params = new URLSearchParams(location.search);
      params.set('compTab', next);
      history.push({ pathname: location.pathname, search: params.toString() });
      contentRef.current?.scrollTo({ top: 0 });
    },
    [history, location.pathname, location.search],
  );
  const refreshMe = useCallback(async (e: Overview) => {
    const token = getToken();
    const state = await call<Me>(`${prefix(e.id)}/me`);
    const records = state.participant
      ? await call<Page<Invite>>(`${prefix(e.id)}/invites/records`)
      : undefined;
    if (state.benefit.status !== 'NOT_ELIGIBLE') {
      state.benefit = await call<Benefit>(`${prefix(e.id)}/benefit`);
    }
    if (token !== getToken()) return;
    meToken.current = token;
    setMe(state);
    setInvites(records);
  }, []);
  const load = useCallback(async () => {
    loadRevision.current += 1;
    const revision = loadRevision.current;
    const token = getToken();
    const current = () =>
      revision === loadRevision.current && token === getToken();
    setBusy(true);
    setReady(false);
    setPublishedResultsCode(undefined);
    setError('');
    setLanding(undefined);
    try {
      const e = await overview(code);
      if (!current()) return;
      setEvent(e);
      // 只以实际发布结果为准；查询失败不影响报名与任务页面。
      getCompetitionResults(e.code)
        .then(result => {
          if (
            current() &&
            ((result.id && result.status === 'PUBLISHED') ||
              (result.finalResults && result.finalResults.length > 0))
          )
            setPublishedResultsCode(code);
        })
        .catch(() => {
          if (current()) setPublishedResultsCode(undefined);
        });
      const owner = invitationOwner(e.code);
      for (const receipt of restoreInvitation(e.code)) {
        // 逐个核验并持久化交接结果，失败时保留尚未处理的原凭据。
        // eslint-disable-next-line no-await-in-loop
        const result = await call<Me>(`${prefix(e.id)}/me/bind`, {
          ...mutation(e.code),
          firstTouchReceipt: receipt,
        });
        if (!current()) return;
        finishInvitationRestore(
          e.code,
          owner,
          receipt,
          result.inviteReceiptStatus === 'ACCEPTED',
        );
      }
      if (inviteCode) {
        try {
          const invitation = await openInvitation(e.code, inviteCode);
          if (!current()) return;
          setLanding(invitation);
        } catch (reason) {
          if (!current()) return;
          // 无效邀请入口只影响邀请提示，不阻断本人报名信息的读取。
          setError(reason instanceof Error ? reason.message : t.failed);
        }
      }
      if (token) {
        const req = mutation(e.code);
        const result = await call<Me>(`${prefix(e.id)}/me/bind`, req);
        if (!current()) return;
        if (result.inviteReceiptStatus === 'IGNORED_INVALID') {
          clearInvitationReceipt(e.code, owner, req.firstTouchReceipt || '');
        }
        await refreshMe(e);
      } else {
        setMe(undefined);
        setInvites(undefined);
      }
      if (current()) setReady(true);
    } catch (reason) {
      if (current())
        setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      if (current()) setBusy(false);
    }
  }, [code, inviteCode, refreshMe]);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [tab]);
  useEffect(() => {
    setInvitationStep(inviteCode ? 'welcome' : undefined);
  }, [code, inviteCode]);
  useEffect(() => {
    setTrack(undefined);
    setRosterVisible(false);
    setMe(undefined);
    setInvites(undefined);
    load();
    return () => {
      loadRevision.current += 1;
    };
  }, [load, accountSession]);
  async function act(operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await operation();
      if (event) await refreshMe(event);
      message.success(t.saved);
    } catch (reason) {
      if (reason && typeof reason === 'object' && 'errorFields' in reason)
        return;
      setError(reason instanceof Error ? reason.message : t.failed);
    } finally {
      setBusy(false);
    }
  }
  const participant = me?.participant;
  const showChoice =
    (!participant ||
      ['PROFILE_ONLY', 'REMOVED'].includes(participant.status)) &&
    !track;
  const showRoster =
    me?.team?.qualificationStatus === 'APPROVED' &&
    (rosterVisible || participant?.role !== 'CAPTAIN');
  const showSummary =
    !!participant &&
    (participant.track === 'INDIVIDUAL' ||
      (showRoster && me?.team?.registrationStatus === 'REGISTERED'));
  const hasRegistration =
    !!participant && participant.status !== 'PROFILE_ONLY';
  const invitationAvailable = !!inviteCode && !!landing && !landing.reason;
  useEffect(() => {
    if (
      !ready ||
      !hasRegistration ||
      !inviteCode ||
      !getToken() ||
      meToken.current !== getToken()
    )
      return;
    // 报名身份确认后只保留页面导航参数；签名凭据与首次归属仍按账号保存。
    const params = new URLSearchParams();
    params.set('compTab', tab);
    if (tab === 'leaderboard') {
      params.set(
        'board',
        new URLSearchParams(location.search).get('board') === 'PERSONAL'
          ? 'PERSONAL'
          : 'TEAM',
      );
    }
    setInvitationStep(undefined);
    setLanding(undefined);
    history.replace({ pathname: location.pathname, search: params.toString() });
  }, [
    ready,
    hasRegistration,
    inviteCode,
    accountSession,
    history,
    location.pathname,
    location.search,
    tab,
  ]);
  const continueInvitation = () => {
    if (!getToken()) {
      setInvitationStep('login');
      setLoginOpen(true);
    } else if (hasRegistration) {
      setInvitationStep(undefined);
      changeTab('register');
    } else {
      setInvitationStep('choice');
    }
  };
  const register = () => {
    if (invitationAvailable && !hasRegistration) continueInvitation();
    else changeTab('register');
  };
  // 登录后的账号可能已在冻结名册中，绑定原记录后直接查看报名，不能重新选队。
  useEffect(() => {
    if (invitationStep === 'choice' && ready && hasRegistration) {
      setInvitationStep(undefined);
      changeTab('register');
    }
  }, [invitationStep, ready, hasRegistration, changeTab]);
  return (
    <div className={styles.layout}>
      {!mobile && (
        <CompetitionSidebar
          authenticated={!!getToken()}
          onLogin={() => setLoginOpen(true)}
        />
      )}
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#04252b',
            colorText: '#04252b',
            colorTextSecondary: '#6c757d',
            borderRadius: 8,
            colorBorder: '#d2d6da',
          },
          components: {
            Button: { primaryShadow: 'none' },
            Input: {
              activeBorderColor: '#0cbf9f',
              hoverBorderColor: '#0cbf9f',
            },
          },
        }}
      >
        <main className={styles.page} ref={contentRef}>
          <header className={styles.header}>
            <div className={styles.heading}>
              <RouterLink
                to={
                  mobile
                    ? '/system/carbonAgent'
                    : {
                        pathname: location.pathname,
                        search: homeQuery.toString(),
                      }
                }
                aria-label={mobile ? I18N.error.returnToHomepage : d.backHome}
                onClick={() => contentRef.current?.scrollTo({ top: 0 })}
              >
                <img
                  src={assets['registration-imgBackAgentBtn']}
                  alt=''
                  width={32}
                  height={32}
                />
              </RouterLink>
              <strong>{d.title}</strong>
            </div>
            <nav aria-label={d.title}>
              {[
                ['intro', d.intro],
                ['register', d.register],
                ['tasks', d.tasks],
                ['results', d.results],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type='button'
                  disabled={key === 'results' && !resultsAvailable}
                  className={
                    (['checkin', 'leaderboard', 'fullRanking'].includes(tab)
                      ? 'tasks'
                      : tab) === key
                      ? styles.active
                      : ''
                  }
                  aria-current={
                    (['checkin', 'leaderboard', 'fullRanking'].includes(tab)
                      ? 'tasks'
                      : tab) === key
                      ? 'page'
                      : undefined
                  }
                  onClick={() =>
                    key === 'register' ? register() : changeTab(key)
                  }
                >
                  {label}
                </button>
              ))}
            </nav>
          </header>
          {error && (
            <div className={styles.feedback}>
              <Alert
                type='error'
                showIcon
                message={error}
                action={
                  <Button size='small' onClick={load} loading={busy}>
                    {t.retry}
                  </Button>
                }
              />
            </div>
          )}
          {!event ? (
            <div className={styles.loading}>
              <Spin spinning={busy} />
            </div>
          ) : (
            <>
              <div className={styles.body}>
                {tab === 'intro' && (
                  <CompetitionIntroduction
                    event={event}
                    onRegister={register}
                  />
                )}
                {tab === 'register' && (
                  <div className={styles.registration}>
                    {!event.registrationAvailable && !hasRegistration && (
                      <Alert type='info' message={t.closed} />
                    )}
                    {landing && !hasRegistration && (
                      <Alert
                        type='info'
                        message={I18N.template(t.invitedBy, {
                          name: landing.inviterName,
                        })}
                        description={invitationHint(
                          landing,
                          !!getToken(),
                          event.registrationAvailable,
                        )}
                      />
                    )}
                    <Spin spinning={busy}>
                      <div className={styles.stack}>
                        {showChoice && (
                          <>
                            <div className={styles.sectionHeading}>
                              <h1>{d.chooseTrack}</h1>
                              <p>
                                {participant?.status === 'REMOVED'
                                  ? d.removedCanRegister
                                  : d.chooseTrackHint}
                              </p>
                              {event.phases.find(
                                phase => phase.code === 'REGISTRATION',
                              )?.closesAt && (
                                <p>
                                  {I18N.template(d.registrationDeadlineLabel, {
                                    date: new Date(
                                      event.phases.find(
                                        phase => phase.code === 'REGISTRATION',
                                      )!.closesAt!,
                                    ).toLocaleString(undefined, {
                                      timeZone: 'Asia/Shanghai',
                                      hour12: false,
                                    }),
                                  })}
                                </p>
                              )}
                            </div>
                            <TrackCards
                              onSelect={setTrack}
                              disabled={!event.registrationAvailable}
                            />
                          </>
                        )}
                        {!showChoice && !getToken() && (
                          <div className={styles.login}>
                            <h1>
                              {track === 'ENTERPRISE'
                                ? d.enterprise
                                : d.individual}
                            </h1>
                            <p>{t.profileHint}</p>
                            <Button onClick={() => setTrack(undefined)}>
                              {d.previous}
                            </Button>
                            <Button
                              type='primary'
                              onClick={() => setLoginOpen(true)}
                            >
                              {t.login}
                            </Button>
                          </div>
                        )}
                        {!showChoice && getToken() && ready && (
                          <>
                            {showRoster && me?.team ? (
                              <TeamRoster
                                event={event}
                                team={me.team}
                                captain={participant?.role === 'CAPTAIN'}
                                run={act}
                                busy={busy}
                                onBack={() =>
                                  participant?.role === 'CAPTAIN'
                                    ? setRosterVisible(false)
                                    : changeTab('intro')
                                }
                                onTasks={() => changeTab('tasks')}
                              />
                            ) : !me?.team && track !== 'ENTERPRISE' ? (
                              <IndividualRegistration
                                event={event}
                                me={me}
                                busy={busy}
                                run={act}
                                onBack={() => setTrack(undefined)}
                                onTasks={() => changeTab('tasks')}
                                onError={setError}
                              />
                            ) : (
                              <RegistrationForm
                                event={event}
                                me={me}
                                track={
                                  track ||
                                  (me?.team ? 'ENTERPRISE' : 'INDIVIDUAL')
                                }
                                busy={busy}
                                run={act}
                                onRefresh={() => refreshMe(event)}
                                onError={setError}
                                onBack={() => {
                                  setTrack(undefined);
                                  if (me?.team) changeTab('intro');
                                }}
                                onRoster={() => setRosterVisible(true)}
                              />
                            )}
                            {showSummary &&
                              (me?.team ? (
                                <Collapse
                                  className={styles.registrationDetails}
                                  items={[
                                    {
                                      key: 'details',
                                      label: d.registrationDetails,
                                      children: (
                                        <RegistrationSummary
                                          event={event}
                                          me={me}
                                          invites={invites}
                                          onInvitesChange={setInvites}
                                          onError={setError}
                                        />
                                      ),
                                    },
                                  ]}
                                />
                              ) : (
                                <RegistrationSummary
                                  event={event}
                                  me={me}
                                  invites={invites}
                                  onInvitesChange={setInvites}
                                  onError={setError}
                                />
                              ))}
                          </>
                        )}
                      </div>
                    </Spin>
                  </div>
                )}
                {(tab === 'tasks' || tab === 'checkin') && (
                  <div className={styles.tasksContent}>
                    <CompetitionTasks
                      event={event}
                      me={me}
                      initialModule={tab === 'checkin' ? 'E' : 'C'}
                      onRegister={register}
                    />
                  </div>
                )}
                {tab === 'leaderboard' && (
                  <CompetitionLeaderboard
                    key={`${event.id}:${me?.participant?.id || 'public'}`}
                    event={event}
                    me={me}
                    initialBoard={
                      query.get('board') === 'PERSONAL' ? 'PERSONAL' : 'TEAM'
                    }
                    onBack={() => changeTab('checkin')}
                  />
                )}
                {tab === 'fullRanking' && (
                  <div className={styles.content}>
                    <CompetitionFullRanking
                      event={event}
                      me={me}
                      onBack={() => changeTab('tasks')}
                    />
                  </div>
                )}
                {tab === 'results' && (
                  <div className={styles.content}>
                    <h1>{d.results}</h1>
                    <CompetitionResults event={event} me={me} />
                  </div>
                )}
              </div>
              <CompetitionContacts event={event} dark={tab === 'intro'} />
            </>
          )}
          {landing && invitationAvailable && ready && !hasRegistration && (
            <InvitationDialog
              step={
                invitationStep === 'choice' && hasRegistration
                  ? undefined
                  : invitationStep
              }
              landing={landing}
              event={event}
              error={error}
              busy={busy}
              onClose={() => setInvitationStep(undefined)}
              onAccept={continueInvitation}
              onBack={() => setInvitationStep('choice')}
              onLearn={() => {
                setInvitationStep(undefined);
                changeTab('intro');
              }}
              onJoin={() => {
                setError('');
                setInvitationStep('confirm');
              }}
              initialMobile={me?.participant?.mobile}
              onConfirm={contactMobile =>
                act(async () => {
                  if (!event || !inviteCode) return;
                  await call<Me>(
                    `${prefix(event.id)}/invites/${encodeURIComponent(
                      inviteCode,
                    )}/join`,
                    {
                      ...mutation(event.code, me?.participant?.version),
                      employeeConfirmed: true,
                      mobile: contactMobile,
                    },
                  );
                  setInvitationStep(undefined);
                  setRosterVisible(true);
                  setTrack(undefined);
                  changeTab('register');
                })
              }
              onIndependent={() => {
                setInvitationStep(undefined);
                setTrack(undefined);
                changeTab('register');
              }}
            />
          )}
        </main>
      </ConfigProvider>
      <AgentLoginDialog
        isMobile={mobile}
        open={loginOpen}
        triggerEntry='other'
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setLoginOpen(false);
          if (invitationStep === 'login') setInvitationStep('choice');
        }}
      />
    </div>
  );
}
