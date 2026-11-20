import { Alert, Button, Collapse, Drawer, Empty, Input, Modal, Pagination, Select, Spin, Tag, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined, CloseOutlined, FileOutlined, DownloadOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import FeishuCollection from '../FeishuCollection';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import saveAs from 'file-saver';
import { useMobile } from '@/hooks/use-mobile';
import I18N, { getCurrentLocale } from '@/lang/I18N';
import { downloadFile } from '@/utils';
import { fetchAgentArtifactDownloadUrl, fetchAgentProjectFileDownloadUrl, uploadAgentProjectFile, type AgentProjectFile } from '../../service';
import MaterialContextButton from '../MaterialContextButton';
import { fetchFeishuCapability, fetchFeishuGroups, type FeishuGroup } from '../FeishuCollection/service';
import { materialVersions, readAnalysis, reanalyzeMaterial, retryMaterialAnalysis, searchMaterials, type Analysis, type AnalysisPage, type Material, type CollectionResult, type MaterialPage } from './service';
import styles from './index.module.less';

/** 项目资料页：资料读取与收数管理分别由项目成员权限和白名单控制。 */
export default function MaterialLibrary({ projectId, projectName, onClose, onSelect, onChanged, selectionDisabled }: {
  projectId: string; projectName: string; onClose: () => void;
  onSelect: (file: AgentProjectFile, context: string) => void; onChanged?: () => void; selectionDisabled?: boolean;
}) {
  const text = I18N.feishuCollection;
  const mobile = useMobile();
  const [query, setQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('');
  const [bindingId, setBindingId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MaterialPage>();
  const [available, setAvailable] = useState(false);
  const [hasFeishuMaterials, setHasFeishuMaterials] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const downloadRequest = useRef<AbortController>();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; downloadRequest.current?.abort(); }; }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { setKeyword(query); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    fetchFeishuCapability(projectId, controller.signal).then(value => {
      if (!controller.signal.aborted) setAvailable(Boolean(value.available || value.enabled));
    }).catch(() => { if (!controller.signal.aborted) setAvailable(false); });
    return () => controller.abort();
  }, [projectId]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    searchMaterials(projectId, { keyword, source, bindingId, offset: (page - 1) * 20 }, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result);
          if (result.counts) setHasFeishuMaterials(result.counts.feishu > 0);
          else if (result.items.some(item => item.sources.length > 0)) setHasFeishuMaterials(true);
          if (page > 1 && !result.items.length) setPage(Math.max(1, Math.ceil(result.total / 20)));
        }
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.materialLoadFailed); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, keyword, source, bindingId, page, refresh, text.materialLoadFailed]);
  const filter = (nextSource: string, nextGroup = '') => { setSource(nextSource); setBindingId(nextGroup); setPage(1); };
  const download = async (item: Material) => {
    if (downloadRequest.current) return;
    const controller = new AbortController(); downloadRequest.current = controller;
    setDownloading(String(item.file.assetId));
    try {
      const file = await fetchAgentProjectFileDownloadUrl(projectId, item.file.assetId, controller.signal);
      if (controller.signal.aborted) return;
      if (!file.downloadUrl) throw new Error(I18N.carbonAgent.projectFileDownloadUnavailable);
      saveAs(file.downloadUrl, file.fileName || item.file.fileName);
    } catch (failure) {
      if (!controller.signal.aborted) message.error(failure instanceof Error ? failure.message : I18N.carbonAgent.fileDownloadFailedRetry);
    } finally {
      if (downloadRequest.current === controller) downloadRequest.current = undefined;
      if (!controller.signal.aborted) setDownloading(undefined);
    }
  };
  const showFeishu = available || hasFeishuMaterials;
  const filters = [{ key: '', label: text.allMaterials, count: data?.counts?.all },
    { key: 'manual', label: text.manualUpload, count: data?.counts?.manual },
    ...(showFeishu ? [{ key: 'feishu', label: text.title, count: data?.counts?.feishu }] : [])];
  return <section className={styles.page}>
    <header className={styles.pageHeader}>
      <Button icon={<ArrowLeftOutlined />} aria-label={text.backToProject} onClick={onClose} />
      <h1>{text.materialList}</h1>
      <Button type='text' icon={<CloseOutlined />} aria-label={text.closeMaterialList} onClick={onClose} />
    </header>
    <div className={styles.filters}>
      {filters.map(item => <button type='button' key={item.key} aria-pressed={source === item.key && !bindingId}
        onClick={() => filter(item.key)}>{item.label} <span>{item.count ?? '—'}</span></button>)}
      {showFeishu && (data?.groups?.length ?? 0) > 0 && <>
        {(data?.groups?.length ?? 0) > 1 && <button type='button' aria-pressed={source === 'feishu' && !bindingId} onClick={() => filter('feishu')}>
          {text.allFeishuGroups} <span>{data?.counts?.feishu ?? '—'}</span></button>}
        {data?.groups.map(group => <button type='button' key={group.bindingId} title={group.name}
          aria-pressed={bindingId === group.bindingId} onClick={() => filter('feishu', group.bindingId)}>
          {group.name} <span>{group.count}</span></button>)}
      </>}
    </div>
    <div className={styles.listToolbar}>
      <Input prefix={<SearchOutlined />} aria-label={text.materialSearch} placeholder={text.materialSearch} allowClear
        value={query} onChange={event => setQuery(event.target.value)} />
      <FeishuCollection projectId={projectId} projectName={projectName} onChanged={() => setRefresh(value => value + 1)} />
      <Button type='primary' icon={<UploadOutlined />} loading={uploading} onClick={() => input.current?.click()}>
        {I18N.carbonAgent.uploadProjectFiles}</Button>
      <input ref={input} type='file' hidden aria-label={I18N.carbonAgent.uploadProjectFiles} onChange={async event => {
        const element = event.currentTarget;
        const file = element.files?.[0]; element.value = '';
        if (!file || uploading) return;
        setUploading(true);
        try {
          await uploadAgentProjectFile(projectId, file);
          if (mounted.current) { setQuery(''); setKeyword(''); filter(''); setRefresh(value => value + 1); onChanged?.(); }
        } catch (failure) {
          if (mounted.current) message.error(failure instanceof Error ? failure.message : I18N.carbonAgent.projectFileUploadFailed);
        } finally { if (mounted.current) setUploading(false); }
      }} />
    </div>
    {error && <Alert type='error' showIcon message={error} action={<Button onClick={() => setRefresh(value => value + 1)}>{text.refresh}</Button>} />}
    <Spin spinning={loading}>
      <div className={styles.tableScroll} role='region' aria-label={text.materialList}>
        <table className={styles.table}>
          <thead><tr>{[text.materialName, text.source, text.submitterGroup, text.fileSize, text.syncedUploadedAt, text.actions]
            .map(label => <th key={label} scope='col'>{label}</th>)}</tr></thead>
          <tbody>{!error && data?.items.map(item => {
            // 回调入库时间可能晚于发送时间；列表按实际发送时间选最近来源。
            const origin = item.sources.filter(value => !bindingId || value.bindingId === bindingId)
              .reduce<Material['sources'][number] | undefined>((latest, value) =>
                !latest || dayjs(value.sentAt).valueOf() > dayjs(latest.sentAt).valueOf() ? value : latest, undefined);
            const timestamp = origin?.sentAt || item.file.createTime;
            const notes = item.supplements?.map(note => note.text).join(' · ');
            return <tr key={String(item.file.assetId)}>
              <td><div className={styles.fileName} title={item.file.fileName}>
                <FileOutlined aria-hidden /><span>{item.file.fileName}</span></div>
                {notes && <p className={styles.note} title={notes}>{notes}</p>}</td>
              <td><span className={item.sources.length ? styles.feishuTag : styles.manualTag}>{item.sources.length ? text.title : text.manualUpload}</span></td>
              <td>{origin ? <div className={styles.submitter}>
                <span>{origin.senderName || text.submitterUnavailable}</span><small title={origin.groupName}>{origin.groupName}</small></div>
                : <div className={styles.submitter}><span>{item.file.uploaderUserName || '—'}</span><small>{item.file.uploaderCompanyName}</small></div>}</td>
              <td>{item.file.fileSize == null ? '—' : `${new Intl.NumberFormat(getCurrentLocale(), { maximumFractionDigits: 1 }).format(item.file.fileSize / 1024)} KB`}</td>
              <td>{timestamp && dayjs(timestamp).isValid() ? dayjs(timestamp).format('YYYY/MM/DD HH:mm') : '—'}</td>
              <td><div className={styles.rowActions}><MaterialContextButton projectId={projectId} className={styles.contextButton} disabled={selectionDisabled || loading}
                file={{ ...item.file, projectId, fileId: item.file.workspaceFileId, canDelete: false }}
                onSelect={file => onSelect(file, item.supplements?.length ? [I18N.template(text.materialContext, { val1: item.file.fileName }),
                  ...item.supplements.map(note => `${note.groupName}\n${note.text}`)].join('\n\n') : '')} />
                <Button type='text' icon={<DownloadOutlined />} aria-label={`${I18N.carbonAgent.download} ${item.file.fileName}`}
                  loading={downloading === String(item.file.assetId)} disabled={Boolean(downloading)} onClick={() => download(item)} />
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {!loading && !error && !data?.items.length && <Empty className={styles.empty} description={text.noFilesMatch} />}
    </Spin>
    {(data?.total ?? 0) > 20 && <Pagination className={styles.pagination} current={page} pageSize={20} total={data?.total}
      showSizeChanger={false} onChange={setPage} simple={mobile} />}
  </section>;
}


/** 按固定解析版本分页展示完整提取块、缺项和后续补充，切换版本时重置分页。 */
export function MaterialDetail({ projectId, material, statuses, onClose, onChanged }: {
  projectId: string; material: Pick<Material, 'sources' | 'reusableAnalysis' | 'supplements'> & {
    file: Pick<Material['file'], 'assetId' | 'fileName' | 'admittedAnalysisJobId'>;
  }; statuses: Record<string, string>; onClose: () => void; onChanged: () => void;
}) {
  const [versions, setVersions] = useState<Analysis[]>([]);
  const [jobId, setJobId] = useState<string>();
  const [detail, setDetail] = useState<AnalysisPage>();
  const [collection, setCollection] = useState<{ jobId: string; result: CollectionResult }>();
  const [downloading, setDownloading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<FeishuGroup[]>([]);
  const [bindingId, setBindingId] = useState<string>();
  const [canAnalyze, setCanAnalyze] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [modal, modalContext] = Modal.useModal();
  // 用户确认一次重新分析只生成一个键；响应丢失时复用，避免重复建版本和计费。
  const requestKey = useRef<string>();
  const mounted = useRef(true);
  const mobile = useMobile();
  const text = I18N.feishuCollection;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchFeishuCapability(projectId, controller.signal).then(async capability => {
      if (!capability.enabled || controller.signal.aborted) return;
      const available = await fetchFeishuGroups(projectId, controller.signal);
      if (!controller.signal.aborted) {
        setCanAnalyze(true); setGroups(available.filter(group => group.status === 'ACTIVE'));
        setBindingId(material.sources.find(origin => available.some(group => group.status === 'ACTIVE' && group.bindingId === origin.bindingId))?.bindingId);
      }
    }).catch(() => { if (!controller.signal.aborted) setCanAnalyze(false); });
    return () => controller.abort();
  }, [projectId, material]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    materialVersions(projectId, material.file.assetId, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setVersions(result);
        setJobId(result.find(version => version.selectable === true)?.jobId || result[0]?.jobId);
        setOffset(0);
      }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.materialLoadFailed); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, material.file.assetId, refresh, text.materialLoadFailed]);
  useEffect(() => {
    if (!jobId) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setDetail(undefined);
    readAnalysis(projectId, material.file.assetId, jobId, offset, controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setDetail(result);
        if (offset === 0) setCollection(result.collectionResult ? { jobId, result: result.collectionResult } : undefined);
      }
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.materialLoadFailed); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, material.file.assetId, jobId, offset, refresh, text.materialLoadFailed]);
  const collectionResult = collection && collection.jobId === jobId ? collection.result : undefined;
  const evidenceItems = [...new Map(collectionResult?.evidence.map(evidence => [JSON.stringify(evidence), evidence])).entries()];
  const sourceVersion = versions.find(version => version.jobId === detail?.analysis.sourceJobId);
  const coverageLabels = { complete: text.coverageComplete, partial: text.analysisPartial, unsupported: text.unsupported };
  /** 收数与重新分析分开确认，由服务端核验付费归属及是否存在未结束任务。 */
  const reanalyze = () => modal.confirm({ title: text.reanalyze, content: text.reanalyzeHint,
    okText: text.confirm, cancelText: text.cancel, onOk: async () => {
      if (!bindingId) return;
      requestKey.current ??= nanoid(32);
      setBusy(true); setError('');
      try {
        await reanalyzeMaterial(projectId, material.file.assetId, bindingId, requestKey.current);
        if (mounted.current) { requestKey.current = undefined; setRefresh(value => value + 1); onChanged(); }
      } catch (failure) {
        if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
      } finally { if (mounted.current) setBusy(false); }
    } });
  return <Drawer title={material.file.fileName} open width={mobile ? '100%' : 760} onClose={onClose}>
    {modalContext}<div className={styles.content}>
      <Alert type='info' showIcon message={text.materialHint} />
      <h3>{text.source}</h3>
      {material.sources.length ? material.sources.map(origin => <div key={origin.receiptId} className={styles.origin}>
        <strong>{origin.senderName || text.submitterUnavailable}</strong><span>{origin.groupName}</span>
        <span>{origin.sentAt && dayjs(origin.sentAt).isValid() ? dayjs(origin.sentAt).format('YYYY/MM/DD HH:mm') : '—'}</span>
        {origin.materialReason && <p>{origin.materialReason}</p>}
      </div>) : <p>{text.manualSource}</p>}
      {Boolean(material.supplements?.length) && <><h3>{text.groupContext}</h3>
        {material.supplements?.map(note => <section className={styles.chunk} key={note.receiptId}>
          <strong>{note.groupName}</strong><pre>{note.text}</pre>
        </section>)}
      </>}
      <div className={styles.toolbar}>
        <Select aria-label={text.analysisVersion} placeholder={text.analysisVersion} value={jobId}
          onChange={value => { setJobId(value); setOffset(0); }} options={versions.map(version => ({ value: version.jobId,
            label: `${I18N.template(text.fileVersion, { val1: version.revision })} · ${statuses[version.status] || version.status}` }))} />
        <Button disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>{text.refresh}</Button>
      </div>
      {error && <Alert type='error' showIcon message={error} />}
      <Spin spinning={loading}>
        {!loading && !jobId && <Empty description={text.notAnalyzed} />}
        {detail && <>
          {detail.analysis.publishable === false && <Alert type='warning' showIcon message={text.supersededAnalysis} />}
          {detail.analysis.scopeRef && <div className={styles.coverage}>
            <strong>{text.derivedResult}</strong><p>{detail.analysis.processingScope}</p>
            {sourceVersion && <Button size='small' onClick={() => { setJobId(sourceVersion.jobId); setOffset(0); }}>
              {I18N.template(text.sourceAnalysisVersion, { val1: sourceVersion.revision })}
            </Button>}
          </div>}
          <p>{detail.analysis.summary}</p>
          {detail.analysis.errorCode && <Alert type='warning' message={I18N.template(text.receiptError, { val1: detail.analysis.errorCode })} />}
          {detail.coverage && <div className={styles.coverage}><strong>{text.coverage}</strong>
            <span>{detail.coverage.processedUnits} / {detail.coverage.totalUnits} {detail.coverage.unit}</span>
            {[...new Set(detail.coverage.unprocessed)].map(value => <p key={value}>{value}</p>)}
          </div>}
          {collectionResult && <>
            <div className={styles.coverage}>
              <strong>{text.coverage}</strong>
              <Tag>{coverageLabels[collectionResult.coverage]}</Tag>
              <p>{collectionResult.processedScope}</p>
              {[...new Set(collectionResult.unprocessedReasons)].map(value => <p key={value}>{value}</p>)}
            </div>
            {collectionResult.resultKind === 'scoped_derivation' && <Alert type='info'
              message={text.derivedResult} description={collectionResult.derivationRule} />}
            {collectionResult.contentArtifactRef && <Button loading={downloading} onClick={async () => {
              const artifactId = collectionResult.contentArtifactRef;
              if (!artifactId) return;
              setDownloading(true); setError('');
              try {
                const artifact = await fetchAgentArtifactDownloadUrl(artifactId);
                if (mounted.current && artifact.downloadUrl) downloadFile(artifact.downloadUrl, artifact.filename);
              } catch (failure) {
                if (mounted.current) setError(failure instanceof Error ? failure.message : text.materialLoadFailed);
              } finally { if (mounted.current) setDownloading(false); }
            }}>{text.downloadExtractedContent}</Button>}
            {collectionResult.evidence.length > 0 && <Collapse items={[{ key: 'evidence', label: text.sourceEvidence,
              children: evidenceItems.map(([key, evidence]) => <section className={styles.chunk} key={key}>
                <strong>{I18N.template(text.fileVersion, { val1: evidence.materialVersion })}</strong>
                <pre>{evidence.sourceType === 'document_region'
                  ? I18N.template(text.documentEvidence, { val1: evidence.page, val2: evidence.region })
                  : [evidence.sheet, evidence.cell || evidence.range].filter(Boolean).join(' · ')}
                  {evidence.derivationRule ? `\n${evidence.derivationRule}` : ''}
                  {evidence.matchedRowCount != null ? `\n${I18N.template(text.evidenceRows, { val1: evidence.matchedRowCount })}` : ''}</pre>
              </section>),
            }]} />}
          </>}
          <h3>{text.missingItems}</h3>
          {detail.missingItems.length ? <ul>{[...new Set(detail.missingItems)].map(value => <li key={value}>{value}</li>)}</ul> : <p>{text.noMissingRecorded}</p>}
          {detail.warnings.length > 0 && <Alert type='warning' message={text.analysisWarnings} description={<ul>{[...new Set(detail.warnings)].map(value => <li key={value}>{value}</li>)}</ul>} />}
          <h3>{text.extractedContent}</h3>
          {detail.chunks.map(chunk => <section className={styles.chunk} key={chunk.chunkId}><strong>{chunk.locator}</strong><pre>{chunk.content}</pre></section>)}
          {detail.totalChunks > 10 && <Pagination simple current={offset / 10 + 1} pageSize={10}
            total={detail.totalChunks} onChange={value => setOffset((value - 1) * 10)} />}
          {!material.supplements?.length && detail.supplements?.length > 0 && <><h3>{text.groupContext}</h3>
            {detail.supplements.map(item => <section className={styles.chunk} key={item.receiptId}>
              <strong>{item.sentAt} · {item.reason}</strong><pre>{readSupplement(item.content)}</pre>
            </section>)}
          </>}
        </>}
      </Spin>
      {canAnalyze && <div className={styles.reanalyze}>
        <p>{text.reanalyzeHint}</p>
        <Select aria-label={text.targetGroup} placeholder={text.targetGroup} value={bindingId} disabled={busy || Boolean(requestKey.current)}
          onChange={setBindingId} options={groups.map(group => ({ value: group.bindingId, label: group.name }))} />
        <Button loading={busy} disabled={!bindingId || loading || versions.some(version => version.status === 'PROCESSING'
          || (version.publishable !== false && ['WAITING', 'BLOCKED'].includes(version.status)))}
          onClick={reanalyze}>{text.reanalyze}</Button>
        {versions[0]?.status === 'BLOCKED' && versions[0].publishable !== false && <Button disabled={busy} onClick={() => modal.confirm({
          title: text.retryAnalysis, content: text.retryAnalysisHint, okText: text.confirm, cancelText: text.cancel,
          onOk: async () => {
            setBusy(true); setError('');
            try {
              await retryMaterialAnalysis(projectId, versions[0].jobId);
              if (mounted.current) { setRefresh(value => value + 1); onChanged(); }
            } catch (failure) {
              if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
            } finally { if (mounted.current) setBusy(false); }
          },
        })}>{text.retryAnalysis}</Button>}
      </div>}
    </div>
  </Drawer>;
}

/** 将已关联的补充消息展示为原文；不能反向修改保存的解析结果。 */
function readSupplement(content: string) {
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' ? value.text : content;
  } catch { return content; }
}
