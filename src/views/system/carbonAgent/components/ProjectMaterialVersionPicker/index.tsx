import { ArrowLeftOutlined } from '@ant-design/icons';
import I18N from '@/lang/I18N';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import type { AgentProjectFile } from '../../service';
import { materialVersions, type Analysis } from '../MaterialLibrary/service';
import { normalizeMaterialReference } from '../../materialReference';
import style from './index.module.less';

type Props = {
  file: AgentProjectFile;
  projectId: string;
  onBack: () => void;
  onSelect: (file: AgentProjectFile) => void;
};

/** 在原资料选择框内固定解析版本；不默认取最新，不在加载失败时自动改用原件。 */
export default function ProjectMaterialVersionPicker({ file, projectId, onBack, onSelect }: Props) {
  const [versions, setVersions] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setVersions([]);
    materialVersions(projectId, file.assetId, controller.signal).then(items => {
      if (!controller.signal.aborted) setVersions(items);
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [projectId, file.assetId, retryKey]);

  const renderVersions = () => {
    if (loading) return <p role='status'>{I18N.carbonAgent.projectFilesLoading}</p>;
    if (failed) return <div role='alert' className={style.state}>
      <span>{I18N.feishuCollection.materialLoadFailed}</span>
      <button type='button' onClick={() => setRetryKey(value => value + 1)}>{I18N.carbonAgent.retry}</button>
    </div>;
    if (!versions.length) return <p role='status'>{I18N.feishuCollection.noReusableAnalysis}</p>;
    return <ul>{versions.map(version => {
      const reference = normalizeMaterialReference({ ...version, assetId: file.assetId });
      // 前端仅作可选性提示，发送时 Java 再验证当前权限、原件及发布状态。
      const reusable = reference && version.publishable !== false
        && (file.version == null || version.fileVersion === file.version)
        && (!file.fileHash || version.fileHash === file.fileHash);
      let statusText = I18N.feishuCollection.analysisUnavailable;
      if (reusable) statusText = version.status === 'PARTIAL' ? I18N.feishuCollection.analysisPartial : I18N.feishuCollection.analysisReady;
      return <li key={version.jobId}>
        <button type='button' disabled={!reusable} onClick={() => {
          if (reusable && reference) onSelect({ ...file, analysisJobId: version.jobId, materialAnalysis: reference });
        }}>
          <span className={style.row}>
            <strong>{I18N.template(I18N.feishuCollection.selectedAnalysisVersion, { val1: version.revision })}</strong>
            <span className={version.status === 'PARTIAL' ? style.partial : style.status}>{statusText}</span>
          </span>
          {version.processingScope && <span className={style.scope}>{version.processingScope}</span>}
          {version.summary && <span className={style.summary}>{version.summary}</span>}
          <small>{I18N.template(I18N.feishuCollection.originalFileVersion, { val1: version.fileVersion })}
            {version.createTime && ` · ${dayjs(version.createTime).format('YYYY-MM-DD HH:mm')}`}</small>
        </button>
      </li>;
    })}</ul>;
  };

  return <section className={style.picker} aria-label={I18N.feishuCollection.selectAnalysisVersion}>
    <header>
      <button type='button' onClick={onBack} aria-label={I18N.carbonAgent.back}><ArrowLeftOutlined /></button>
      <strong>{I18N.feishuCollection.selectAnalysisVersion}</strong>
    </header>
    <div className={style.fileName} title={file.fileName}>{file.fileName}</div>
    <p className={style.hint}>{I18N.feishuCollection.fixedAnalysisHint}</p>
    <div className={style.body} aria-busy={loading}>
      {renderVersions()}
    </div>
    <footer>
      <button type='button' onClick={() => onSelect({ ...file, analysisJobId: undefined, materialAnalysis: undefined })}>
        {I18N.feishuCollection.useOriginalFile}
      </button>
      <small>{I18N.feishuCollection.originalFileHint}</small>
    </footer>
  </section>;
}
