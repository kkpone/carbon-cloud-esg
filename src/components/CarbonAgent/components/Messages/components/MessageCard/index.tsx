import I18N from '@/lang/I18N';
import { useState } from 'react';
import { Alert, Button } from 'antd';
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  DownloadOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useModelNavigation } from '../../../../useModelNavigation';
import { useEnterpriseNavigation } from '../../../../useEnterpriseNavigation';
import { useCarbonAgent } from '../../../../context';
import {
  ENTERPRISE_CARBON_CARD_TYPES,
  getEnterpriseBusinessRecord,
  getEnterpriseBusinessValue,
  getEnterpriseCarbonAccountingYear,
  getEnterpriseCarbonBusinessId,
  getEnterpriseCarbonBusinessKind,
  getEnterpriseCarbonReportFiles,
  getEnterpriseCarbonReportYear,
  getReadyEnterpriseCarbonReportFiles,
} from '../../../../enterprise/enterpriseBusinessCard';
import {
  buildResume,
  cardPayload,
  decodeFileName,
  isApproval,
  modelingApproval,
  record,
  text,
} from '../../../../protocol';
import type { Block } from '../../../../protocol';
import { api } from '../../../../api';
import AgentForm from '../../../AgentForm';
import ModelingReview from './components/ModelingReview';
import ApprovalReview from './components/ApprovalReview';
import EnterpriseSubjectModal from './components/EnterpriseSubjectModal';
import styles from './index.module.less';

export default function MessageCard({
  block,
  draftId,
  failed: turnFailed,
  disabled,
}: {
  block: Block;
  draftId: string;
  failed: boolean;
  disabled: boolean;
}) {
  const agent = useCarbonAgent();
  const navigation = useModelNavigation();
  const enterpriseNav = useEnterpriseNavigation();
  const [error, setError] = useState('');
  const [batchDownloading, setBatchDownloading] = useState(false);
  const payload = cardPayload(
    block.card ? record(block.card) : { ...record(block.extra), ...block },
  );
  const kind = text(payload.cardType || block.blockType);
  const templates = record(payload.resumeRequest);
  const modelAction = modelingApproval(payload);
  const approval = isApproval(payload);
  const processed =
    payload.processed === true ||
    payload.resolved === true ||
    payload.actionSubmitted === true ||
    payload.submitted === true;
  if (kind === 'form_request' || kind === 'form' || templates.submit)
    return (
      <AgentForm
        payload={payload}
        draftId={draftId}
        disabled={
          disabled || payload.processed === true || payload.resolved === true
        }
        onSubmit={body =>
          agent.send(body).catch(cause => setError(cause.message))
        }
      />
    );
  const execute = (action: string) => {
    try {
      agent
        .send(buildResume(payload, action))
        .catch(cause => setError(cause.message));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : I18N.carbonAgent.executeFailed,
      );
    }
  };
  const ref = record(payload.bizRef);
  const accountId = text(
    payload.accountId ||
      ref.accountId ||
      (ref.bizType === 'account' ? ref.bizId : undefined) ||
      (kind === 'product_carbon_model' ? payload.bizId : undefined),
  );
  const productId = text(
    ref.productId ||
      payload.productId ||
      record(payload.data).productId ||
      record(payload.snapshot).productId,
  );
  const failed =
    turnFailed || /FAILED|ERROR|CANCELLED/i.test(text(payload.status));
  const modelReady = kind === 'product_carbon_model' && !!accountId && !failed;
  const enterpriseRecords = [
    getEnterpriseBusinessRecord(payload.extra),
    ref,
    getEnterpriseBusinessRecord(payload.data),
    getEnterpriseBusinessRecord(payload.summary),
    getEnterpriseBusinessRecord(payload.snapshot),
    payload,
  ];
  const enterpriseKind = getEnterpriseCarbonBusinessKind(enterpriseRecords);
  const enterpriseSummary = getEnterpriseBusinessRecord(payload.summary);
  const session = agent.chat?.session;
  const enterpriseYear =
    (enterpriseKind === 'report'
      ? getEnterpriseCarbonReportYear(enterpriseRecords)
      : getEnterpriseCarbonAccountingYear(enterpriseRecords)) ||
    text(session?.year);
  const enterpriseOrgId =
    getEnterpriseBusinessValue(enterpriseRecords, ['orgId', 'org_id']) ||
    text(session?.orgId);
  const enterpriseComputationIds = enterpriseRecords
    .flatMap(item => [item.computationIds, item.computation_ids])
    .find(Array.isArray) as unknown[] | undefined;
  const enterpriseComputationId =
    getEnterpriseBusinessValue(enterpriseRecords, [
      'computationId',
      'computation_id',
    ]) ||
    text(enterpriseComputationIds?.[0]) ||
    text(session?.computationId);
  const enterpriseComputationPeriod =
    getEnterpriseBusinessValue(enterpriseRecords, [
      'computationPeriod',
      'computation_period',
    ]) || text(session?.computationPeriod);
  const enterpriseVersionType =
    getEnterpriseBusinessValue(enterpriseRecords, [
      'versionType',
      'version_type',
      'categoryType',
      'category_type',
      'categoryTypeLabel',
    ]) || text(session?.versionType);
  const enterpriseReportId =
    getEnterpriseBusinessValue(enterpriseRecords, [
      'reportId',
      'report_id',
      'bizId',
      'biz_id',
    ]) || getEnterpriseCarbonBusinessId(enterpriseRecords);
  const enterpriseReportFiles = getReadyEnterpriseCarbonReportFiles(
    getEnterpriseCarbonReportFiles(enterpriseRecords),
  );
  const enterpriseComputationReady =
    (kind === ENTERPRISE_CARBON_CARD_TYPES.computation ||
      enterpriseKind === 'account') &&
    !failed &&
    Boolean(enterpriseComputationId || enterpriseYear || enterpriseOrgId);
  const enterpriseReportReady =
    (kind === ENTERPRISE_CARBON_CARD_TYPES.report ||
      enterpriseKind === 'report') &&
    !failed &&
    Boolean(enterpriseReportId || enterpriseReportFiles.length);
  const enterpriseOrgNameList = Array.isArray(enterpriseSummary.orgNames)
    ? enterpriseSummary.orgNames.map(text).filter(Boolean)
    : [];
  const enterpriseScopeNames = enterpriseOrgNameList.length
    ? enterpriseOrgNameList.join(I18N.carbonAgent.enterpriseCarbonValueSeparator)
    : text(enterpriseSummary.accountingScope || enterpriseSummary.orgName);
  const actions = (['reject', 'cancel', 'approve', 'confirm'] as const).filter(
    action => templates[action],
  );
  const showActions =
    kind === 'carbon_model_handoff' ||
    modelReady ||
    enterpriseComputationReady ||
    enterpriseReportReady ||
    actions.length > 0;
  const parsedReportId = Number(enterpriseReportId);
  const handleDownloadAllReports = async () => {
    if (
      !Number.isSafeInteger(parsedReportId) ||
      parsedReportId <= 0 ||
      batchDownloading
    )
      return;
    setBatchDownloading(true);
    setError('');
    try {
      const downloadUrl = await api<string>(
        `/enterprise/calculate/report/batchDownload?reportId=${encodeURIComponent(
          String(parsedReportId),
        )}`,
      );
      if (downloadUrl) {
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : I18N.carbonAgent.requestFailed,
      );
    } finally {
      setBatchDownloading(false);
    }
  };
  return (
    <section
      className={[
        styles.card,
        modelReady || enterpriseComputationReady || enterpriseReportReady
          ? styles.result
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className={styles.header}>
        {modelReady || enterpriseComputationReady || enterpriseReportReady ? (
          <CheckCircleFilled aria-hidden />
        ) : (
          <FileTextOutlined aria-hidden />
        )}
        <strong>
          {modelReady
            ? I18N.carbonAgent.modelReady
            : enterpriseComputationReady
            ? I18N.carbonAgent.accountingReady
            : enterpriseReportReady
            ? I18N.carbonAgent.reportReady
            : modelAction
            ? I18N.carbonAgent.reviewModel
            : approval
            ? I18N.carbonAgent.reviewExecution
            : kind === 'carbon_model_handoff'
            ? I18N.carbonAgent.handoffTitle
            : I18N.carbonAgent.taskResult}
        </strong>
        {processed && (
          <span className={styles.status}>{I18N.carbonAgent.processed}</span>
        )}
      </header>
      <div className={styles.panel}>
        {!approval && !!text(payload.title) && (
          <h3 className={styles.title}>{decodeFileName(payload.title)}</h3>
        )}
        {modelAction ? (
          <ModelingReview action={modelAction} payload={payload} />
        ) : approval ? (
          <ApprovalReview payload={payload} />
        ) : enterpriseComputationReady ? (
          <div className={styles.enterpriseMeta}>
            {!!text(enterpriseSummary.timeTypeLabel || enterpriseYear) && (
              <p className={styles.description}>
                {I18N.template(
                  I18N.carbonAgent.enterpriseCarbonAccountingPeriodDisplay,
                  {
                    val1:
                      text(enterpriseSummary.timeTypeLabel) || enterpriseYear,
                  },
                )}
              </p>
            )}
            {!!text(enterpriseSummary.categoryTypeLabel) && (
              <p className={styles.description}>
                {I18N.template(
                  I18N.carbonAgent.enterpriseCarbonAccountingStandardDisplay,
                  {
                    val1: text(enterpriseSummary.categoryTypeLabel),
                  },
                )}
              </p>
            )}
            {!!enterpriseScopeNames && (
              <p className={styles.description}>
                {I18N.template(
                  I18N.carbonAgent.enterpriseCarbonAccountingScopeDisplay,
                  {
                    val1: enterpriseScopeNames,
                  },
                )}
              </p>
            )}
            {!!text(
              enterpriseSummary.totalEmission ||
                enterpriseSummary.emissionTotal,
            ) && (
              <p className={styles.description}>
                {I18N.template(
                  I18N.carbonAgent.enterpriseCarbonTotalEmissionDisplay,
                  {
                    val1:
                      text(
                        enterpriseSummary.totalEmission ||
                          enterpriseSummary.emissionTotal,
                      ) +
                      (text(
                        enterpriseSummary.emissionUnit ||
                          enterpriseSummary.unit,
                      )
                        ? ' ' +
                          text(
                            enterpriseSummary.emissionUnit ||
                              enterpriseSummary.unit,
                          )
                        : ''),
                  },
                )}
              </p>
            )}
          </div>
        ) : enterpriseReportReady ? (
          <div className={styles.enterpriseMeta}>
            {!!payload.description && (
              <p className={styles.description}>{text(payload.description)}</p>
            )}
            {enterpriseReportFiles.length > 0 && (
              <div className={styles.reportFiles}>
                {enterpriseReportFiles.map((file, index) => {
                  const fileName =
                    file.fileName ||
                    file.versionTypeLabel ||
                    I18N.template(
                      I18N.carbonAgent.enterpriseCarbonReportFileDefaultName,
                      { val1: index + 1 },
                    );
                  return (
                    <a
                      key={file.path || fileName}
                      href={file.path}
                      target='_blank'
                      rel='noreferrer'
                      download={fileName}
                      className={styles.reportFileLink}
                    >
                      <DownloadOutlined aria-hidden />
                      <span>{fileName}</span>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          !!payload.description && (
            <p className={styles.description}>{text(payload.description)}</p>
          )
        )}
        {showActions && (
          <div className={styles.actions}>
            {kind === 'carbon_model_handoff' && (
              <Button
                type='primary'
                disabled={
                  disabled ||
                  agent.chat?.handledRequests.includes(text(payload.requestId))
                }
                onClick={() => agent.handoff(payload)}
              >
                {I18N.carbonAgent.confirmModel}
              </Button>
            )}
            {modelReady && (
              <Button
                type='primary'
                loading={navigation.loading}
                onClick={() => navigation.open(accountId, productId)}
              >
                {I18N.carbonAgent.viewModel}
                <ArrowRightOutlined aria-hidden />
              </Button>
            )}
            {enterpriseComputationReady && (
              <Button
                type='primary'
                loading={enterpriseNav.loading}
                onClick={() =>
                  enterpriseNav.openAccounting({
                    computationId: enterpriseComputationId,
                    computationPeriod: enterpriseComputationPeriod,
                    orgId: enterpriseOrgId,
                    orgName:
                      text(enterpriseSummary.orgName) ||
                      text(session?.orgName),
                    orgNames: enterpriseOrgNameList,
                    versionType: enterpriseVersionType,
                    year: enterpriseYear,
                    viewMode: 'canvas',
                  })
                }
              >
                {I18N.carbonAgent.viewAccounting}
                <ArrowRightOutlined aria-hidden />
              </Button>
            )}
            {enterpriseReportReady && (
              <>
                {Number.isSafeInteger(parsedReportId) && parsedReportId > 0 && (
                  <Button
                    loading={batchDownloading}
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadAllReports}
                  >
                    {I18N.carbonAgent.downloadAllReports}
                  </Button>
                )}
                <Button
                  type='primary'
                  onClick={() => enterpriseNav.openReportList(enterpriseYear)}
                >
                  {I18N.carbonAgent.viewReportList}
                  <ArrowRightOutlined aria-hidden />
                </Button>
              </>
            )}
            {actions.map(action => (
              <Button
                key={action}
                type={
                  ['approve', 'confirm'].includes(action)
                    ? 'primary'
                    : 'default'
                }
                disabled={disabled || processed}
                onClick={() => execute(action)}
              >
                {['approve', 'confirm'].includes(action)
                  ? I18N.carbonAgent.confirmExecute
                  : I18N.carbonFootprint3.cancel}
              </Button>
            ))}
          </div>
        )}
        {(error || navigation.error || enterpriseNav.error) && (
          <Alert
            showIcon
            type='error'
            message={error || navigation.error || enterpriseNav.error}
          />
        )}
      </div>
      {enterpriseNav.subjectPicker && (
        <EnterpriseSubjectModal
          open
          groups={enterpriseNav.subjectPicker.groups}
          onSelect={enterpriseNav.selectSubject}
          onCancel={enterpriseNav.closeSubjectPicker}
        />
      )}
    </section>
  );
}
