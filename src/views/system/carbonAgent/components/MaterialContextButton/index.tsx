import { message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import I18N from '@/lang/I18N';
import type { AgentProjectFile } from '../../service';
import { resolveProjectMaterialSelection } from '../MaterialLibrary/service';

/** 项目列表与 @ 选择使用相同规则，直接固定可用结果并加入输入框。 */
export default function MaterialContextButton({ file, projectId, className, disabled = false, onSelect }: {
  file: AgentProjectFile;
  projectId: string;
  className?: string;
  disabled?: boolean;
  onSelect: (file: AgentProjectFile) => void;
}) {
  const [busy, setBusy] = useState(false);
  const pending = useRef<AbortController>();
  useEffect(() => {
    setBusy(false);
    return () => pending.current?.abort();
  }, [projectId, file.assetId]);
  return <button type='button' className={className} disabled={busy || disabled} aria-busy={busy} onClick={async () => {
    if (pending.current && !pending.current.signal.aborted) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const selected = await resolveProjectMaterialSelection(projectId, file, controller.signal);
      if (!controller.signal.aborted) onSelect(selected);
    } catch {
      if (!controller.signal.aborted) message.error(I18N.feishuCollection.materialLoadFailed);
    } finally {
      if (pending.current === controller) pending.current = undefined;
      if (!controller.signal.aborted) setBusy(false);
    }
  }}>{I18N.feishuCollection.useAsContext}</button>;
}
