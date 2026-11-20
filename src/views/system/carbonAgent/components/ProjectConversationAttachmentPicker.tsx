import { ArrowLeftOutlined } from '@ant-design/icons';
import projectFolderIcon from '@src/assets/images/carbonAgent/icons/folder.svg';
import I18N from '@src/lang/I18N';
import { useMobile } from '@/hooks/use-mobile';
import { Input, Popover, Tooltip, message, type InputRef } from 'antd';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';

import Icon from './Icon';
import style from './ProjectConversationAttachmentPicker.module.less';
import { icons } from '../constants';
import { type AgentProjectFile, fetchAgentProjectFiles } from '../service';
import { fetchFeishuMaterialSources, resolveProjectMaterialSelection } from './MaterialLibrary/service';

type ProjectConversationAttachmentPickerProps = {
  className?: string;
  disabled?: boolean;
  iconClassName?: string;
  projectId: string;
  onLocalFilesSelect: () => void;
  onProjectFileSelect: (file: AgentProjectFile) => void;
  mentionQuery?: string;
  onMentionClose?: () => void;
};

type AttachmentPickerView = 'files' | 'menu';

const loadProjectConversationFiles = (projectId: string, signal: AbortSignal) =>
  fetchAgentProjectFiles(projectId, signal);

const getProjectFileKey = (file: AgentProjectFile) =>
  String(file.assetId || file.fileId);

const ProjectConversationAttachmentPicker = ({
  className,
  disabled = false,
  iconClassName,
  projectId,
  onLocalFilesSelect,
  onProjectFileSelect,
  mentionQuery,
  onMentionClose,
}: ProjectConversationAttachmentPickerProps) => {
  const isMobile = useMobile();
  const [menuOpen, setOpen] = useState(false);
  const [menuView, setView] = useState<AttachmentPickerView>('menu');
  const open = !disabled && (menuOpen || mentionQuery !== undefined);
  const view = mentionQuery === undefined ? menuView : 'files';
  const [query, setQuery] = useState('');
  const searchRef = useRef<InputRef>(null);
  const [files, setFiles] = useState<AgentProjectFile[]>([]);
  const [feishuSources, setFeishuSources] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const selectionAbortRef = useRef<AbortController>();
  const visibleFiles = files.filter(file => file.fileName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  useEffect(() => {
    if (mentionQuery !== undefined) setQuery(mentionQuery);
  }, [mentionQuery]);

  useEffect(() => {
    if (!open || view !== 'files') return;
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, view]);

  useEffect(() => {
    setOpen(false);
    setView('menu');
    setFiles([]);
    setFeishuSources({});
    setLoadError(false);
    setLoading(false);
    setSelecting(false);
    return () => selectionAbortRef.current?.abort();
  }, [projectId]);

  useEffect(() => {
    if (!open || view !== 'files') {
      return undefined;
    }

    let cancelled = false;
    const abortController = new AbortController();

    setLoading(true);
    setLoadError(false);

    loadProjectConversationFiles(projectId, abortController.signal)
      .then(nextFiles => {
        if (!cancelled) {
          setFiles(nextFiles);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFiles([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [open, projectId, retryKey, view]);

  useEffect(() => {
    if (!open || view !== 'files') return;
    const controller = new AbortController();
    fetchFeishuMaterialSources(projectId, controller.signal).then(sources => {
      if (!controller.signal.aborted) setFeishuSources(sources);
    }).catch(() => { /* 来源信息读取失败时保留文件选择能力，不推测来源。 */ });
    return () => controller.abort();
  }, [open, projectId, retryKey, view]);

  const closePicker = () => {
    selectionAbortRef.current?.abort();
    selectionAbortRef.current = undefined;
    setSelecting(false);
    setOpen(false);
    setView('menu');
    setQuery('');
    onMentionClose?.();
  };

  const selectProjectFile = async (file: AgentProjectFile) => {
    if (selectionAbortRef.current && !selectionAbortRef.current.signal.aborted) return;
    const controller = new AbortController();
    selectionAbortRef.current = controller;
    setSelecting(true);
    try {
      const selected = await resolveProjectMaterialSelection(projectId, file, controller.signal);
      if (controller.signal.aborted) return;
      onProjectFileSelect(selected);
      closePicker();
    } catch {
      if (!controller.signal.aborted) message.error(I18N.feishuCollection.materialLoadFailed);
    } finally {
      if (selectionAbortRef.current === controller) {
        selectionAbortRef.current = undefined;
        setSelecting(false);
      }
    }
  };

  const content =
    view === 'menu' ? (
      <div
        className={style.projectAttachmentMenu}
        role='menu'
        aria-label={I18N.carbonAgent.addAttachment}
      >
        <button
          type='button'
          role='menuitem'
          onClick={() => {
            closePicker();
            onLocalFilesSelect();
          }}
        >
          {I18N.carbonAgent.uploadLocalAttachment}
        </button>
        <button type='button' role='menuitem' onClick={() => setView('files')}>
          {I18N.carbonAgent.selectFromProjectFiles}
        </button>
      </div>
    ) : (
      <div
        className={style.projectAttachmentFiles}
        role='dialog'
        aria-label={I18N.carbonAgent.selectFromProjectFiles}
      >
        <header>
          <button
            type='button'
            aria-label={I18N.carbonAgent.back}
            onClick={() => { if (mentionQuery !== undefined) closePicker(); else setView('menu'); }}
          >
            <ArrowLeftOutlined />
          </button>
          <strong>{I18N.carbonAgent.selectFromProjectFiles}</strong>
        </header>
        <Input ref={searchRef} value={query} allowClear placeholder={I18N.feishuCollection.searchFiles}
          aria-label={I18N.feishuCollection.searchFiles}
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); closePicker(); } }}
          onPressEnter={event => {
            if (event.nativeEvent.isComposing || loading || selecting || !visibleFiles.length) return;
            event.preventDefault();
            event.stopPropagation();
            selectProjectFile(visibleFiles[0]);
          }} />
        <div className={style.projectAttachmentFileBody}>
          {loading || selecting ? (
            <span>{I18N.carbonAgent.projectFilesLoading}</span>
          ) : loadError ? (
            <div className={style.projectAttachmentFileState}>
              <span>{I18N.carbonAgent.projectFilesLoadFailed}</span>
              <button
                type='button'
                onClick={() => setRetryKey(value => value + 1)}
              >
                {I18N.carbonAgent.retry}
              </button>
            </div>
          ) : visibleFiles.length ? (
            <ul>
              {visibleFiles.map(file => (
                <li key={getProjectFileKey(file)}>
                  <button
                    type='button'
                    title={file.fileName}
                    onClick={() => {
                      selectProjectFile(file);
                    }}
                  >
                    <img src={projectFolderIcon} alt='' aria-hidden='true' />
                    <span className={style.projectAttachmentFileLabel}>
                      <span className={style.projectAttachmentTitle}><span>{file.fileName}</span>
                        {feishuSources[String(file.assetId)] && <Tooltip title={feishuSources[String(file.assetId)]}>
                          <span className={style.sourceBadge}>{I18N.feishuCollection.syncedFromFeishu}</span>
                        </Tooltip>}
                      </span>
                      <small>{[file.uploaderUserName, file.createTime ? dayjs(file.createTime).format('YYYY-MM-DD HH:mm') : '',
                        file.version ? I18N.template(I18N.feishuCollection.fileVersion, { val1: file.version }) : ''].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <span>{query ? I18N.feishuCollection.noFilesMatch : I18N.carbonAgent.projectFilesEmpty}</span>
          )}
        </div>
      </div>
    );

  return (
    <Popover
      arrow={false}
      content={content}
      open={open}
      overlayClassName={style.projectAttachmentPopover}
      placement={isMobile ? 'top' : 'topLeft'}
      trigger='click'
      onOpenChange={nextOpen => {
        if (!nextOpen) { closePicker(); return; }
        setOpen(nextOpen);

        if (!nextOpen) {
          setView('menu');
        }
      }}
    >
      <button
        className={className}
        type='button'
        data-agent-login-entry='file_upload'
        aria-label={I18N.carbonAgent.addAttachment}
        aria-expanded={open}
        aria-haspopup='menu'
        disabled={disabled}
      >
        <Icon className={iconClassName} src={icons.addIcon} />
      </button>
    </Popover>
  );
};

export default ProjectConversationAttachmentPicker;
