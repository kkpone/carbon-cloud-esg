import agentIcon from '@/assets/images/carbonAgent/icons/agent-logo.svg';
import I18N from '@/lang/I18N';
import { Alert, Button, List, Spin, ConfigProvider, Tooltip } from 'antd';
import {
  CloseOutlined,
  HistoryOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { LocaleContext } from '@/components/LocaleProvider';
import { useMobile } from '@/hooks/use-mobile';
import { RouteMaps } from '@/router/route-paths';
import { RouteMapsCorbonFootprint3 } from '@/router/route-paths/corbonFootprint3';
import { getToken } from '@/utils/cookie';
import { FootprintAccountInfoUrlStatus } from '@/views/carbonFootprint3/FootprintAccount/constant';
import {
  EChatSource,
  useAICarbonFloating,
} from '../AICarbonFloating/AICarbonContext';
import { normalizeEnterpriseYear, useCarbonAgent } from './context';
import { api, openTeamManagement, reasonText } from './api';
import { list, record, text } from './protocol';
import type { Data } from './protocol';
import Composer from './components/Composer';
import Messages from './components/Messages';
import ResizeHandle from './components/ResizeHandle';
import FloatingLauncher, {
  launcherModifiers,
} from './components/FloatingLauncher';
// 暂停 Agent 建模记录入口，保留组件实现。
// import Records from './components/Records';
import styles from './index.module.less';

const hiddenPaths = [
  '/system/login',
  '/register',
  '/account',
  '/forgot-password',
  '/reset-password',
  '/404',
  '/403',
  '/500',
  '/error404',
  '/ESG/aiGenerateDetail',
  '/carbonFootprint3/footprintAccount/shareAccountLogin',
  '/carbonFootprint3/footprintAccount/share',
  '/enterpriseCarbonAccounting/share',
  '/enterpriseCarbonAccounting/accounting/share',
  RouteMaps.enterpriseCarbonAccountingNoLoginTaskList,
  RouteMaps.enterpriseCarbonAccountingNoLoginApprovalList,
  RouteMaps.questionnaireFill.replace(':id', ''),
  RouteMaps.ESGImportanceAnalysisFill.replace(':id', ''),
  RouteMaps.scanLogin,
];
export default function CarbonAgent() {
  const agent = useCarbonAgent();
  const { locale } = useContext(LocaleContext);
  const legacy = useAICarbonFloating();
  const location = useLocation();
  const mobile = useMobile();
  const [panelWidth, setPanelWidth] = useState(490);
  const panelRef = useRef<HTMLElement>(null);
  const resizeStartWidth = useRef(panelWidth);
  const resizeSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 2 } }),
  );
  const launcherSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<Data[]>([]);
  // const [records, setRecords] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(agent);
  latest.current = agent;
  const routeParams = new URLSearchParams(location.search);
  const isModelEditing =
    location.pathname ===
      RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountDetail &&
    routeParams.get('status') === String(FootprintAccountInfoUrlStatus.EDIT);
  const sharedContext =
    routeParams.has('shareId') ||
    routeParams.has('shareAuth') ||
    ['2', '3', '6', '7', '8'].includes(routeParams.get('snapFlag') || '');
  const hidden =
    sharedContext ||
    !getToken() ||
    hiddenPaths.some(path => location.pathname.startsWith(path)) ||
    (mobile && location.pathname === '/');
  useEffect(() => {
    if (!legacy.isExpanded || hidden) return;
    const prefill =
      [legacy.ReferencesText, legacy.extra].filter(Boolean).join('\n\n') ||
      undefined;
    legacy.setExpanded(false);
    legacy.setExtra('');
    legacy.setReferencesText('');
    // 只转移用户文本；旧工作流菜单、topicId 和执行回调不映射为工具指令。
    const modelId =
      location.pathname ===
      RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountDetail
        ? routeParams.get('accountId')
        : undefined;
    const enterpriseComputationId =
      location.pathname === RouteMaps.enterpriseCarbonAccountingAccounting
        ? routeParams.get('computationId')
        : undefined;
    const opening = modelId
      ? latest.current.openModel(
          modelId,
          routeParams.get('productId') || undefined,
          prefill,
        )
      : legacy.chatSource === EChatSource.PRODUCT_CARBON && legacy.accountId
      ? latest.current.openModel(String(legacy.accountId), undefined, prefill)
      : enterpriseComputationId ||
        legacy.chatSource === EChatSource.ENTERPRISE_CARBON
      ? latest.current.openEnterprise(
          {
            computationId: enterpriseComputationId || undefined,
            computationPeriod:
              routeParams.get('computationPeriod') || undefined,
            orgId: routeParams.get('orgId') || undefined,
            orgName: routeParams.get('orgName') || undefined,
            year:
              normalizeEnterpriseYear(
                routeParams.get('year') ||
                  routeParams.get('period') ||
                  routeParams.get('periodName'),
              ) || undefined,
            entry:
              legacy.chatSource === EChatSource.ENTERPRISE_CARBON
                ? 'enterprise_annual_report'
                : 'enterprise_accounting_detail',
          },
          prefill,
        )
      : latest.current.openGeneral(prefill, true);
    opening.catch(cause => setError(cause.message));
  }, [legacy.isExpanded, hidden]);
  useEffect(() => {
    if (isModelEditing) setHistoryOpen(false);
  }, [isModelEditing]);
  useEffect(() => {
    if (!historyOpen || !agent.opened || hidden || isModelEditing) return;
    const abort = new AbortController();
    api<unknown>('/ai/agent/sessions/listSessions', undefined, abort.signal)
      .then(value =>
        setSessions(
          list(
            Array.isArray(value)
              ? value
              : record(value).rows ||
                  record(value).sessions ||
                  record(value).list,
          ),
        ),
      )
      .catch(cause => {
        if (!abort.signal.aborted) setError(cause.message);
      });
    return () => abort.abort();
  }, [historyOpen, agent.opened, agent.revision, hidden, isModelEditing]);
  if (hidden) return null;
  const { chat } = agent;
  const accessMessage =
    agent.access && !agent.access.canUseAi
      ? reasonText(agent.access.aiReasonCode || agent.access.reasonCode)
      : undefined;
  const errorMessage = error || agent.error;
  return (
    <>
      {createPortal(
        <ConfigProvider theme={{ token: { zIndexPopupBase: 2200 } }}>
          <div
            className={`${styles.root} ${agent.opened ? styles.opened : ''}`}
          >
            <DndContext
              sensors={launcherSensors}
              modifiers={launcherModifiers}
              autoScroll={false}
              accessibility={{
                screenReaderInstructions: { draggable: '' },
                announcements: {
                  onDragStart: () => undefined,
                  onDragOver: () => undefined,
                  onDragEnd: () => undefined,
                  onDragCancel: () => undefined,
                },
              }}
            >
              <FloatingLauncher
                hidden={agent.opened}
                onOpen={() =>
                  agent.openGeneral().catch(cause => setError(cause.message))
                }
              />
            </DndContext>
            {agent.opened && (
              <DndContext
                sensors={resizeSensors}
                autoScroll={false}
                accessibility={{
                  screenReaderInstructions: {
                    draggable: I18N.carbonAgent.resizeInstructions,
                  },
                  announcements: {
                    onDragStart: () => I18N.carbonAgent.resizeAssistant,
                    onDragEnd: () => undefined,
                    onDragCancel: () => undefined,
                    onDragOver: () => undefined,
                  },
                }}
                onDragStart={() => {
                  resizeStartWidth.current =
                    panelRef.current?.getBoundingClientRect().width ||
                    panelWidth;
                }}
                onDragMove={({ delta }) => {
                  setPanelWidth(
                    Math.min(
                      window.innerWidth,
                      Math.max(360, resizeStartWidth.current - delta.x),
                    ),
                  );
                }}
                onDragCancel={() => setPanelWidth(resizeStartWidth.current)}
              >
                <section
                  ref={panelRef}
                  className={`${styles.panel} ${mobile ? styles.mobile : ''}`}
                  style={{ width: mobile ? '100%' : panelWidth }}
                  aria-label={I18N.carbonAgent.assistantLabel}
                >
                  {!mobile && (
                    <ResizeHandle
                      onAdjust={delta =>
                        setPanelWidth(
                          Math.min(
                            window.innerWidth,
                            Math.max(
                              360,
                              (panelRef.current?.getBoundingClientRect()
                                .width || panelWidth) + delta,
                            ),
                          ),
                        )
                      }
                    />
                  )}
                  <header className={styles.header}>
                    <img src={agentIcon} alt='' />
                    <strong>Carbon Agent</strong>
                    {!isModelEditing && (
                      <>
                        <Tooltip
                          title={I18N.carbonAgent.newConversation}
                          placement='bottom'
                        >
                          <Button
                            type='text'
                            icon={<PlusOutlined />}
                            aria-label={I18N.carbonAgent.newConversation}
                            disabled={agent.loading}
                            onClick={() => {
                              setHistoryOpen(false);
                              agent.openGeneral(undefined, true);
                            }}
                          />
                        </Tooltip>
                        <Tooltip
                          title={I18N.carbonAgent.history}
                          placement='bottom'
                        >
                          <Button
                            type='text'
                            icon={<HistoryOutlined />}
                            aria-label={I18N.carbonAgent.history}
                            onClick={() => setHistoryOpen(!historyOpen)}
                          />
                        </Tooltip>
                      </>
                    )}
                    {agent.access?.canManage && (
                      <Tooltip
                        title={I18N.carbonAgent.teamManagement}
                        placement='bottom'
                      >
                        <Button
                          type='text'
                          icon={<TeamOutlined />}
                          aria-label={I18N.carbonAgent.teamManagement}
                          onClick={() =>
                            openTeamManagement(locale).catch(cause =>
                              setError(cause.message),
                            )
                          }
                        />
                      </Tooltip>
                    )}
                    <Tooltip
                      title={I18N.carbonAgent.collapseAssistant}
                      placement='bottomRight'
                    >
                      <Button
                        type='text'
                        icon={<CloseOutlined />}
                        aria-label={I18N.carbonAgent.collapseAssistant}
                        onClick={agent.close}
                      />
                    </Tooltip>
                  </header>
                  {errorMessage &&
                    errorMessage !== accessMessage &&
                    errorMessage !== chat?.blocked && (
                      <Alert
                        showIcon
                        className={styles.notice}
                        type='error'
                        message={errorMessage}
                        action={
                          <Button
                            size='small'
                            onClick={() => {
                              setError('');
                              agent.retry();
                            }}
                          >
                            {I18N.carbonAgent.recoverConversation}
                          </Button>
                        }
                      />
                    )}
                  {chat?.blocked && (
                    <Alert showIcon type='info' message={chat.blocked} />
                  )}
                  {accessMessage && accessMessage !== chat?.blocked && (
                    <Alert showIcon type='info' message={accessMessage} />
                  )}
                  {historyOpen && !isModelEditing ? (
                    <div className={styles.history}>
                      <List
                        dataSource={sessions}
                        locale={{ emptyText: I18N.carbonAgent.noHistory }}
                        renderItem={session => (
                          <List.Item>
                            <button
                              type='button'
                              onClick={() => {
                                setHistoryOpen(false);
                                agent
                                  .selectSession(
                                    text(session.sessionId || session.id),
                                  )
                                  .catch(cause => setError(cause.message));
                              }}
                            >
                              {text(session.sessionTitle || session.title) ||
                                I18N.carbonAgent.untitledConversation}
                            </button>
                          </List.Item>
                        )}
                      />
                    </div>
                  ) : (
                    <>
                      {agent.loading && (
                        <div className={styles.loading}>
                          <Spin />
                        </div>
                      )}
                      <Messages />
                      <footer className={styles.footer}>
                        <Composer
                          skills={chat?.modelSkills}
                          value={chat?.draft || { message: '', files: [] }}
                          onChange={agent.updateDraft}
                          disabled={
                            agent.loading ||
                            !chat ||
                            !!chat.blocked ||
                            !!chat.uncertain ||
                            !agent.access?.canUseAi
                          }
                          busy={chat?.busy}
                          onSubmit={() =>
                            agent.send().catch(cause => setError(cause.message))
                          }
                          onCancel={() => agent.cancel()}
                        />
                        <small>{I18N.carbonAgent.aiDisclaimer}</small>
                      </footer>
                    </>
                  )}
                </section>
              </DndContext>
            )}
            {/* {records && <Records onClose={() => setRecords(false)} />} */}
          </div>
        </ConfigProvider>,
        document.body,
      )}
    </>
  );
}
