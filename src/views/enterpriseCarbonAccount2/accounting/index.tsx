import useUrlState from '@ahooksjs/use-url-state';
import { FullscreenModal } from '@src/components/FullscreenModal';
import { IconAlibaba, IconAlibabaNew } from '@src/components/iconfont';
import I18N from '@src/lang/I18N';
import { RouteMaps } from '@src/router/route-paths';
import { Toast } from '@src/utils/Toast';
import { Drawer, Modal, Select, Tooltip } from 'antd';
import classNames from 'classnames';
import { isNil } from 'lodash-es';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';

import agentIcon from '@/assets/images/carbonAgent/icons/agent-logo.svg';
import {
  normalizeEnterpriseYear,
  useCarbonAgent,
} from '@/components/CarbonAgent/context';
import {
  EnterpriseCarbonCanvasView,
  type EnterpriseCarbonAccountingContext,
} from '@/components/EnterpriseCarbonCanvas';
import { FormActions } from '@/components/FormActions';
import { checkPermissions } from '@/components/Permission/utils';
import { getToken } from '@/utils/cookie';
import { GetComponentProps } from '@/utils/utilTypes';

import { Result } from './Result';
import {
  apiComputationInfo,
  DataComputationBackData,
} from './baseInfo/service';
import { FillData } from './fillData';
import { EVersionType } from './fillData/service';
import styles from './index.module.less';
import { submitEnterpriseAccounting } from './submitAccounting';
import { StepType } from './type';
import { computationRevokeSubmit } from '../AccountingList/service';
import { COMPUTATION_STATUS, COMPUTATION_STATUS_LABEL } from '../constant';

const getQueryDisplayText = (value?: string | string[]) => {
  const text = (Array.isArray(value) ? value.find(Boolean) : value) || '';
  const halfLength = text.length / 2;

  if (
    Number.isInteger(halfLength) &&
    text.slice(0, halfLength) === text.slice(halfLength)
  ) {
    return text.slice(0, halfLength);
  }

  return text;
};

type AccountingProps = {
  agentVersionType?: EVersionType;
  embedded?: boolean;
  forceReadonly?: boolean;
  isShare?: boolean;
  previewMode?: 'agent';
  projectId?: string;
  sessionId?: string;
  shareId?: string;
  useShareApis?: boolean;
};

const Accounting = (props: AccountingProps) => {
  const {
    agentVersionType,
    embedded = false,
    forceReadonly = false,
    isShare = false,
    previewMode,
    projectId,
    sessionId,
    shareId,
    useShareApis,
  } = props;
  const shouldUseShareApis = useShareApis ?? isShare;
  const [searchParams, setSearchParams] = useUrlState<{
    computationId?: string;
    computationPeriod?: string;
    periodName?: string;
    orgName?: string;
    computationStatus?: string;
    orgId: string;
    orgType?: string;
    period: string;
    step: StepType;
    companyId?: string;
    reportId?: string;
    year?: string;
    preOrgId?: string;
    viewMode?: 'list' | 'canvas';
    versionType?: EVersionType;
  }>({
    orgId: '',
    period: '',
    step: StepType.baseInfo,
  });

  const history = useHistory();
  const agent = useCarbonAgent();

  const [versionType, setVersionType] = useState<EVersionType>(() => {
    const rawVersionType = searchParams.versionType;
    return rawVersionType === EVersionType.iso ||
      rawVersionType === EVersionType.ghg
      ? rawVersionType
      : EVersionType.ghg;
  });
  const [emptySourceIds, setEmptySourceIds] = useState<number[]>([]);
  const [lostFactorSourceIds, setLostFactorSourceIds] = useState<number[]>([]);
  const {
    computationId,
    computationPeriod,
    orgId,
    orgName,
    orgType,
    periodName,
    period,
    companyId,
    reportId,
    year,
    preOrgId,
    viewMode,
    versionType: urlVersionType,
  } = searchParams;
  const displayOrgName = getQueryDisplayText(orgName);
  const isAgentPreview = embedded && previewMode === 'agent';
  const activeViewMode: 'list' | 'canvas' =
    !isAgentPreview && viewMode === 'canvas' ? 'canvas' : 'list';
  const accountingContentId = embedded
    ? 'enterpriseAccountingAgentPreviewContent'
    : 'accountingContent';

  const [computationInfo, setComputationInfo] =
    useState<DataComputationBackData | null>(null);

  const [emissionCount, setEmissionCount] = useState({
    totalCount: 0,
    finishCount: 0,
  });

  const isMainPart = !isNil(computationId);
  const [showResult, setShowResult] = useState(() => !isMainPart);

  const [resultRefreshFlag, setResultRefreshFlag] = useState(true);
  const [agentRefreshKey, setAgentRefreshKey] = useState(0);
  const [listOperateEl, setListOperateEl] = useState<HTMLDivElement | null>(
    null,
  );
  const updateComputationInfo = useCallback(
    async (params: { computationId: string; computationPeriod?: string }) => {
      const { data } = await apiComputationInfo(params);
      setComputationInfo(data.data);
      return data.data;
    },
    [],
  );

  const { computationStatus } = computationInfo || {};
  const hasEmissionSourceEditPermission = !!checkPermissions(
    true,
    'enterprise:computation:edit',
  );
  const canShowAiAgent = Boolean(
    isMainPart && !isAgentPreview && !isShare && !embedded && getToken(),
  );
  const canvasAccountingContext = useMemo<
    EnterpriseCarbonAccountingContext | undefined
  >(() => {
    if (!isMainPart || !computationId) {
      return undefined;
    }

    return {
      companyId,
      computationId: String(computationId),
      computationPeriod: computationPeriod
        ? String(computationPeriod)
        : undefined,
      orgId: String(computationInfo?.orgId ?? orgId ?? ''),
      orgName: displayOrgName || computationInfo?.orgName || '',
      orgType,
      period,
      periodName,
      preOrgId,
      reportId,
      status: computationStatus ?? searchParams.computationStatus,
      versionType,
      year,
    };
  }, [
    companyId,
    computationId,
    computationInfo?.orgId,
    computationInfo?.orgName,
    computationPeriod,
    computationStatus,
    displayOrgName,
    isMainPart,
    orgId,
    orgType,
    period,
    periodName,
    preOrgId,
    reportId,
    searchParams.computationStatus,
    versionType,
    year,
  ]);
  const handleCanvasDataChange = useCallback(() => {
    setResultRefreshFlag(flag => !flag);
    if (!shouldUseShareApis && !isNil(computationId)) {
      updateComputationInfo({ computationId, computationPeriod });
    }
  }, [
    computationId,
    computationPeriod,
    shouldUseShareApis,
    updateComputationInfo,
  ]);
  const handleViewModeChange = (nextViewMode: 'list' | 'canvas') => {
    if (nextViewMode === activeViewMode) {
      return;
    }
    setSearchParams({
      ...searchParams,
      viewMode: nextViewMode,
    });
  };

  const backToListPage = () => {
    if (embedded) {
      return;
    }

    history.push({
      pathname: isShare
        ? RouteMaps.enterpriseCarbonAccountingcarbonDischargeShare
        : RouteMaps.enterpriseCarbonAccountingcarbonDischarge,
      search: isShare
        ? `?companyId=${companyId}&reportId=${reportId}&orgId=${preOrgId}&year=${year}`
        : '',
    });
  };

  useEffect(() => {
    if (shouldUseShareApis) {
      return;
    }
    if (!isNil(computationId)) {
      updateComputationInfo({ computationId, computationPeriod });
    }
  }, [
    computationId,
    computationPeriod,
    shouldUseShareApis,
    updateComputationInfo,
  ]);

  useEffect(() => {
    if (!isAgentPreview || !agentVersionType) {
      return;
    }

    setVersionType(agentVersionType);
  }, [agentVersionType, isAgentPreview]);

  useEffect(() => {
    if (
      isAgentPreview ||
      (urlVersionType !== EVersionType.iso &&
        urlVersionType !== EVersionType.ghg)
    ) {
      return;
    }

    setVersionType(urlVersionType);
  }, [isAgentPreview, urlVersionType]);

  useEffect(() => {
    if (!isMainPart || isShare || shouldUseShareApis) {
      return;
    }
    const handleAgentUpdated = (event: Event) => {
      const detail =
        (event as CustomEvent<{ computationId?: string }>).detail || {};
      if (
        detail.computationId &&
        String(detail.computationId) !== String(computationId)
      ) {
        return;
      }
      setAgentRefreshKey(current => current + 1);
      setResultRefreshFlag(flag => !flag);
      if (!isNil(computationId)) {
        updateComputationInfo({ computationId, computationPeriod });
      }
    };
    window.addEventListener(
      'carbon-agent-enterprise-updated',
      handleAgentUpdated,
    );
    return () =>
      window.removeEventListener(
        'carbon-agent-enterprise-updated',
        handleAgentUpdated,
      );
  }, [
    computationId,
    computationPeriod,
    isMainPart,
    isShare,
    shouldUseShareApis,
    updateComputationInfo,
  ]);

  const openEnterpriseAssistant = () => {
    if (!canShowAiAgent || !computationId) return;
    agent.openEnterprise({
      computationId: String(computationId),
      computationPeriod: computationPeriod
        ? String(computationPeriod)
        : undefined,
      orgId: String(computationInfo?.orgId ?? orgId ?? '') || undefined,
      orgName: displayOrgName || computationInfo?.orgName || undefined,
      versionType,
      year:
        (computationInfo?.cyear ? String(computationInfo.cyear) : undefined) ||
        normalizeEnterpriseYear(year) ||
        normalizeEnterpriseYear(periodName) ||
        normalizeEnterpriseYear(period) ||
        undefined,
      entry: 'enterprise_accounting_detail',
    });
  };

  const revokeSubmit = async () => {
    Modal.confirm({
      className: styles.confirmModal,
      width: 480,
      icon: null,
      title: I18N.enterpriseCarbonAccount2.confirmWithdrawalOfWithdrawal2,
      content: (
        <div className={styles.confirmModalContent}>
          <span>
            {I18N.enterpriseCarbonAccount2.confirmWithdrawalOfWithdrawal}
          </span>
          <span className={styles.confirmModalWarnText}>
            {I18N.enterpriseCarbonAccount2.theResultDataWill}
          </span>
        </div>
      ),
      maskClosable: true,
      onOk: async () => {
        await computationRevokeSubmit({
          computationId,
          computationPeriod,
        });
        Toast('success', I18N.carbonFootprint.operationSuccessful);
        updateComputationInfo({ computationId, computationPeriod });
      },
    });
  };

  const submit = async () => {
    await submitEnterpriseAccounting({
      computationId,
      computationPeriod,
      refreshComputationInfo: () =>
        updateComputationInfo({ computationId, computationPeriod }),
      onValidationFailed: issues => {
        setSearchParams({
          ...searchParams,
          step: StepType.fillData,
          viewMode: 'list',
        });
        setEmptySourceIds(issues.emptySourceIds);
        setLostFactorSourceIds(issues.lostFactorSourceIds);
      },
    });
  };

  const generateReport = () => {
    const periodVal =
      computationInfo?.period?.replace(I18N.DomesticVersion.year, '') ??
      (period as string)?.replace(I18N.DomesticVersion.year, '');
    history.push({
      pathname:
        RouteMaps.enterpriseCarbonAccountingcarbonDischargeAccountReportAdd,
      search: `orgId=${computationInfo?.orgId ?? orgId}&period=${periodVal}`,
    });
  };

  const content = (
    <>
      <div className={styles.accounting}>
        {!isAgentPreview && (
          <div className={styles.header}>
            <div className={styles.computationInfo}>
              <div className={styles.backBtn} onClick={backToListPage}>
                <IconAlibaba
                  className={styles.backIcon}
                  type='icon-a-icon_return'
                />
              </div>
              <div className={styles.orgName} title={displayOrgName}>
                {displayOrgName}
              </div>
              <div className={styles.periodName}>{periodName}</div>
              <div className={styles.split} />
              <Select
                className={styles.ghgTypeSelect}
                variant='borderless'
                value={versionType}
                popupMatchSelectWidth={false}
                onChange={value => {
                  setVersionType?.(value);
                  if (!isAgentPreview) {
                    setSearchParams({
                      ...searchParams,
                      versionType: value,
                    });
                  }
                }}
                suffixIcon={
                  <IconAlibabaNew
                    className={styles.ghgTypeSelectArrow}
                    type='icon-chevron-down'
                  />
                }
                options={[
                  {
                    value: EVersionType.ghg,
                    label: I18N.enterpriseCarbonAccount2.ghgPr2,
                  },
                  {
                    value: EVersionType.iso,
                    label: I18N.enterpriseCarbonAccount2.isoStandard3,
                  },
                ]}
              />
              {isMainPart && (
                <>
                  <div className={styles.split} />
                  <div
                    className={styles.viewSwitch}
                    role='tablist'
                    aria-label={I18N.carbonAgent.previewTypeLabel}
                  >
                    <button
                      type='button'
                      role='tab'
                      aria-selected={activeViewMode === 'list'}
                      className={classNames(styles.viewSwitchButton, {
                        [styles.viewSwitchButtonActive]:
                          activeViewMode === 'list',
                      })}
                      onClick={() => handleViewModeChange('list')}
                    >
                      {I18N.carbonAgent.enterpriseCarbonListView}
                    </button>
                    <button
                      type='button'
                      role='tab'
                      aria-selected={activeViewMode === 'canvas'}
                      className={classNames(styles.viewSwitchButton, {
                        [styles.viewSwitchButtonActive]:
                          activeViewMode === 'canvas',
                      })}
                      onClick={() => handleViewModeChange('canvas')}
                    >
                      {I18N.carbonAgent.enterpriseCarbonCanvasView}
                    </button>
                  </div>
                </>
              )}
            </div>
            {!isShare && (computationInfo || canShowAiAgent) && (
              <div className={styles.headerRight}>
                {computationInfo && (
                  <div className={styles.computationInfo}>
                    <div
                      className={classNames(styles.statusTag, {
                        [styles.fillingStatusTag]:
                          computationStatus === COMPUTATION_STATUS.FILLING,
                        [styles.beFilledStatusTag]:
                          computationStatus === COMPUTATION_STATUS.BE_FILLED,
                        [styles.completedStatusTag]:
                          computationStatus === COMPUTATION_STATUS.COMPLETE,
                      })}
                    >
                      {COMPUTATION_STATUS_LABEL[computationStatus]}
                    </div>
                    {(!isMainPart || activeViewMode === 'canvas') && (
                      <div>
                        <div className={styles.fillPercent}>
                          <span className={styles.fillCount}>
                            {emissionCount.finishCount}
                          </span>
                          <span className={styles.totalCount}>
                            /{emissionCount.totalCount}
                          </span>
                        </div>
                        <div className={styles.progress}>
                          <div
                            className={styles.fillProgress}
                            style={{
                              width: `${emissionCount.totalCount > 0 ? (emissionCount.finishCount / emissionCount.totalCount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isMainPart && activeViewMode === 'list' && (
                  <div
                    ref={setListOperateEl}
                    className={styles.listHeaderOperateSlot}
                  />
                )}
                {canShowAiAgent && (
                  <Tooltip
                    placement='bottom'
                    title={I18N.carbonAgent.pageTitle}
                  >
                    <button
                      type='button'
                      className={styles.aiAgentButton}
                      aria-label={I18N.carbonAgent.pageTitle}
                      onClick={openEnterpriseAssistant}
                    >
                      <img src={agentIcon} alt={I18N.carbonAgent.pageTitle} />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        )}
        <div className={styles.accountingContent} id={accountingContentId}>
          {isMainPart && activeViewMode === 'canvas' && (
            <div className={styles.canvasViewContainer}>
              <EnterpriseCarbonCanvasView
                accountingContext={canvasAccountingContext}
                agentPreviewLayout={false}
                canEditEmissionSource={hasEmissionSourceEditPermission}
                periodDisplayName={periodName}
                projectId={projectId}
                readonly={Boolean(isShare || forceReadonly)}
                refreshKey={agentRefreshKey}
                sessionId={sessionId}
                shareId={shareId}
                versionType={versionType}
                onDataChange={handleCanvasDataChange}
                onSourceStatsChange={setEmissionCount}
              />
            </div>
          )}
          {isMainPart && activeViewMode === 'list' && (
            <FillData
              headerOperateContainer={listOperateEl}
              agentRefreshKey={agentRefreshKey}
              forceReadonly={forceReadonly}
              isShare={isShare}
              agentPreviewLayout={isAgentPreview}
              projectId={projectId}
              orgId={orgId}
              companyId={companyId}
              computationId={computationId}
              computationPeriod={computationPeriod}
              computationStatus={computationStatus}
              versionType={versionType}
              emptySourceIds={emptySourceIds}
              lostFactorSourceIds={lostFactorSourceIds}
              setEmptySourceIds={setEmptySourceIds}
              setLostFactorSourceIds={setLostFactorSourceIds}
              refreshResult={() => setResultRefreshFlag(!resultRefreshFlag)}
              sessionId={sessionId}
              shareId={shareId}
              useShareApis={shouldUseShareApis}
              updateComputationInfo={() => {
                if (!isNil(computationId)) {
                  updateComputationInfo({ computationId, computationPeriod });
                }
              }}
              setEmissionCount={setEmissionCount}
            />
          )}
          <Drawer
            className={styles.accountingResultDrawer}
            rootClassName={styles.accountingResultDrawerRoot}
            height={embedded ? '100%' : 'calc(100% - 124px)'}
            closeIcon={null}
            footer={null}
            placement='bottom'
            open={showResult}
            mask={false}
            destroyOnClose
            getContainer={() =>
              document.getElementById(accountingContentId) || document.body
            }
          >
            {isMainPart ? (
              <Result
                refreshFlag={resultRefreshFlag}
                computationInfo={computationInfo}
                computationPeriod={computationPeriod}
                orgId={computationInfo?.orgId ?? orgId}
                orgType={orgType}
                versionType={versionType}
              />
            ) : (
              <Result
                refreshFlag={resultRefreshFlag}
                orgId={orgId}
                orgType={orgType}
                period={period}
                computationPeriod={computationPeriod}
                versionType={versionType}
              />
            )}
          </Drawer>
        </div>
      </div>
      {!isAgentPreview && !isShare && (
        <FormActions
          width='100%'
          place='center'
          buttons={(() => {
            if (!isMainPart) {
              // 核算分组
              return [
                {
                  type: 'primary' as const,
                  title: I18N.carbonFootprint.generateReport,
                  permission: 'enterprise:report:add',
                  onClick: generateReport,
                },
                {
                  type: 'default' as const,
                  title: I18N.enterpriseCarbonAccount2.quit,
                  onClick: backToListPage,
                },
              ];
            }

            // 核算主体
            const btnList: GetComponentProps<typeof FormActions>['buttons'] =
              [];

            if (computationStatus === COMPUTATION_STATUS.COMPLETE) {
              btnList.push(
                ...[
                  {
                    type: 'default' as const,
                    title: showResult
                      ? I18N.enterpriseCarbonAccount2.closePreview
                      : I18N.enterpriseCarbonAccount2.previewResults,
                    onClick: () => setShowResult(!showResult),
                  },
                  {
                    type: 'primary' as const,
                    title: I18N.enterpriseCarbonAccount2.withdrawSubmission,
                    permission: 'computation:status:revocation',
                    onClick: revokeSubmit,
                  },
                  {
                    type: 'default' as const,
                    title: I18N.carbonFootprint.generateReport,
                    permission: 'enterprise:report:add',
                    onClick: generateReport,
                  },
                ],
              );
            } else {
              btnList.push({
                type: 'primary' as const,
                title: I18N.components.submit,
                permission: 'computation:status:submit',
                onClick: () => submit(),
              });
            }

            btnList.push({
              type: 'default' as const,
              title:
                computationStatus === COMPUTATION_STATUS.FILLING
                  ? I18N.enterpriseCarbonAccount2.saveAndExit
                  : I18N.enterpriseCarbonAccount2.quit,
              onClick: backToListPage,
            });
            return btnList;
          })()}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div
        className={classNames(styles.accountingEmbeddedRoot, {
          [styles.accountingEmbeddedRootAgentPreview]: isAgentPreview,
        })}
      >
        {content}
      </div>
    );
  }

  return <FullscreenModal>{content}</FullscreenModal>;
};

export default Accounting;
